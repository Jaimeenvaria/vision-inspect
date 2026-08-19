import os
import json
import logging
import google.generativeai as genai

logger = logging.getLogger("factoryvision.llm")

class LLMExplanationService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.enabled = bool(self.api_key and self.api_key != "your_gemini_api_key" and self.api_key != "")
        
        if self.enabled:
            try:
                genai.configure(api_key=self.api_key)
                # Using lightweight gemini-1.5-flash for fast and cost-effective responses
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                logger.info("Gemini LLM explanation service initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to configure Gemini API: {e}. Falling back to rule-based explanations.")
                self.enabled = False
        else:
            logger.info("Gemini API key not configured. Using rule-based explanation generator.")

    async def explain_defects(self, defects: list) -> list:
        """
        Takes a list of defect dicts (from YOLO detection) and populates
        each dict with technical 'explanation' and 'suggested_action' fields.
        """
        if not defects:
            return []
            
        if not self.enabled:
            return self._generate_rule_based_explanations(defects)
            
        try:
            return await self._generate_llm_explanations(defects)
        except Exception as e:
            logger.error(f"Gemini API request failed: {e}. Using rule-based fallbacks.")
            return self._generate_rule_based_explanations(defects)

    async def _generate_llm_explanations(self, defects: list) -> list:
        # Construct system instructions and input variables in prompt
        prompt = (
            "You are an industrial Quality Control AI assistant installed in a Tesla-style Gigafactory. "
            "Below is a list of defects detected on a manufacturing component by the Computer Vision model. "
            "Analyze these defects and return a valid JSON array of objects. "
            "Each object in the array corresponds to the input defect at the same index, and MUST contain exactly these two fields:\n"
            "1. 'explanation': A concise, technical sentence explaining what this defect is, why it failed QC, and potential manufacturing causes (e.g. pressure mismatch, nozzle clog, conveyor belt vibration, etc.).\n"
            "2. 'suggested_action': Clear action instructions prefixed with either 'PASS', 'REWORK', or 'REJECT' (e.g. 'REWORK: Direct to manual buffing station').\n\n"
            "Input Defects:\n"
        )
        
        for i, d in enumerate(defects):
            prompt += f"- Defect {i}: Type='{d['type']}', Confidence={d['confidence']}, Severity='{d['severity']}'\n"
            
        prompt += (
            "\nOutput ONLY a valid raw JSON array. Do NOT wrap it in markdown code blocks like ```json ... ```. "
            "Do NOT include any introduction or summary text. Just the JSON array."
        )
        
        # Run blocking model call in executor to keep the event loop responsive
        import asyncio
        loop = asyncio.get_event_loop()
        
        def _call_gemini():
            response = self.model.generate_content(prompt)
            return response.text
            
        raw_response = await loop.run_in_executor(None, _call_gemini)
        
        # Clean response and parse JSON array
        try:
            cleaned_response = raw_response.strip()
            # Strip markdown block wrappers if model ignores instruction
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response.split("\n", 1)[1]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response.rsplit("\n", 1)[0]
                cleaned_response = cleaned_response.strip()
                if cleaned_response.lower().startswith("json"):
                    cleaned_response = cleaned_response[4:].strip()
                    
            explanations = json.loads(cleaned_response)
            
            for i, d in enumerate(defects):
                if i < len(explanations):
                    d["explanation"] = explanations[i].get("explanation", "").strip()
                    d["suggested_action"] = explanations[i].get("suggested_action", "").strip()
                else:
                    self._fill_single_rule_based(d)
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}. Raw: {raw_response}")
            return self._generate_rule_based_explanations(defects)
            
        return defects

    def _generate_rule_based_explanations(self, defects: list) -> list:
        for d in defects:
            self._fill_single_rule_based(d)
        return defects

    def _fill_single_rule_based(self, d: dict):
        dtype = d["type"].lower()
        
        explanations_db = {
            "scratch": {
                "explanation": f"A cosmetic surface scratch was detected (Confidence: {int(d['confidence']*100)}%). This indicates mechanical friction during handling or micro-debris on the transport rollers.",
                "action": "REWORK: Direct to manual buffing and polishing area."
            },
            "dent": {
                "explanation": f"An indentation deviation exceeding 1.5mm tolerance was detected (Confidence: {int(d['confidence']*100)}%). Likely caused by excessive pressure in the stamping press or physical impact during part transit.",
                "action": "REWORK: Direct to hydraulic reshaping station."
            },
            "crack": {
                "explanation": f"Fissure detected in casting (Confidence: {int(d['confidence']*100)}%). Safety integrity is severely compromised. Typically caused by rapid thermal cooling or material impurity.",
                "action": "REJECT: Scrap part immediately. Log metallurgy sample."
            },
            "paint defect": {
                "explanation": f"Surface paint run, blister, or dust particle contamination detected (Confidence: {int(d['confidence']*100)}%). Points to paint spray nozzle clogging or electrostatic booth filter wear.",
                "action": "REWORK: Sand down paint drip and route to secondary spraying chamber."
            },
            "misalignment": {
                "explanation": f"Sub-assembly orientation deviation detected (Confidence: {int(d['confidence']*100)}%). Points to guide manipulator calibration slip or secondary locator pin wear.",
                "action": "REWORK: Re-align component clamps and perform robot sensor calibration."
            },
            "missing component": {
                "explanation": f"Critical assembly fastener or connector is missing (Confidence: {int(d['confidence']*100)}%). Points to parts feeder depletion or pneumatic tool jamming.",
                "action": "REWORK: Direct to manual insert bay C to install missing parts."
            },
            "rust": {
                "explanation": f"Oxidation corrosion detected on exposed metal surface (Confidence: {int(d['confidence']*100)}%). Caused by ambient relative humidity or failure in wash passivation bath.",
                "action": "REJECT: Scrap component due to surface oxidation."
            },
            "safety hazard (human)": {
                "explanation": f"Personnel intrusion detected inside active robotic workcell boundary (Confidence: {int(d['confidence']*100)}%).",
                "action": "REJECT: E-STOP triggered. Halt line. Clear robotic zone."
            },
            "foreign object": {
                "explanation": f"Foreign tool, phone, or wire detected inside the assembly path (Confidence: {int(d['confidence']*100)}%).",
                "action": "REWORK: Stop feed, manually extract foreign object, and check calibration."
            }
        }
        
        default_val = {
            "explanation": f"Anomalous surface variation detected (Confidence: {int(d['confidence']*100)}%). Potential cause includes optical camera lens contamination or material inclusion.",
            "action": "REWORK: Route to quality supervisor desk for manual audit."
        }
        
        matched = explanations_db.get(dtype, default_val)
        d["explanation"] = matched["explanation"]
        d["suggested_action"] = matched["action"]
