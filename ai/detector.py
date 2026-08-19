import os
import random
import logging
import cv2

logger = logging.getLogger("factoryvision.ai")

class DefectDetector:
    def __init__(self):
        self.simulate = os.getenv("SIMULATE_AI", "True").lower() in ("true", "1", "yes")
        self.model = None
        
        if not self.simulate:
            try:
                from ultralytics import YOLO
                # Load lightweight YOLOv8 Nano model (~6MB)
                # It will automatically download to the root directory if not present
                self.model = YOLO("yolov8n.pt")
                logger.info("YOLOv8 model loaded successfully.")
            except Exception as e:
                logger.warning(f"Failed to load YOLOv8 model: {e}. Falling back to Simulated AI Mode.")
                self.simulate = True
        else:
            logger.info("Simulated AI Mode is enabled in environment variables.")

    def detect(self, image_path: str, output_path: str) -> list:
        """
        Detects quality defects from the image at image_path,
        saves the annotated image with bounding boxes to output_path,
        and returns a structured list of defects.
        """
        if self.simulate:
            return self._simulate_detection(image_path, output_path)
        else:
            try:
                return self._run_yolo_detection(image_path, output_path)
            except Exception as e:
                logger.error(f"YOLO inference failed: {e}. Falling back to simulation.")
                return self._simulate_detection(image_path, output_path)

    def _simulate_detection(self, image_path: str, output_path: str) -> list:
        # Load image with OpenCV
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image at {image_path}")
            
        height, width, _ = img.shape
        filename = os.path.basename(image_path).lower()
        
        defects = []
        
        # Trigger specific defects based on keywords in the file name
        if "scratch" in filename:
            defects.append({
                "type": "scratch",
                "confidence": 0.89,
                "box": [0.15, 0.2, 0.35, 0.55],  # normalized coords [x_min, y_min, x_max, y_max]
                "severity": "low"
            })
        elif "dent" in filename:
            defects.append({
                "type": "dent",
                "confidence": 0.78,
                "box": [0.4, 0.3, 0.65, 0.6],
                "severity": "medium"
            })
        elif "crack" in filename:
            defects.append({
                "type": "crack",
                "confidence": 0.92,
                "box": [0.3, 0.15, 0.5, 0.75],
                "severity": "high"
            })
        elif "rust" in filename:
            defects.append({
                "type": "rust",
                "confidence": 0.85,
                "box": [0.2, 0.4, 0.6, 0.8],
                "severity": "high"
            })
        elif "paint" in filename:
            defects.append({
                "type": "paint defect",
                "confidence": 0.74,
                "box": [0.7, 0.5, 0.85, 0.7],
                "severity": "low"
            })
        else:
            # 25% chance of a random defect for demo images
            if random.random() < 0.25:
                defect_type, severity = random.choice([
                    ("scratch", "low"), 
                    ("dent", "medium"), 
                    ("crack", "high"), 
                    ("paint defect", "low"),
                    ("misalignment", "medium"), 
                    ("missing component", "high"), 
                    ("rust", "high"),
                    ("anomaly", "medium")
                ])
                x_min = random.uniform(0.1, 0.5)
                y_min = random.uniform(0.1, 0.5)
                x_max = x_min + random.uniform(0.15, 0.3)
                y_max = y_min + random.uniform(0.15, 0.3)
                defects.append({
                    "type": defect_type,
                    "confidence": round(random.uniform(0.68, 0.94), 2),
                    "box": [x_min, y_min, x_max, y_max],
                    "severity": severity
                })
                
        # Draw bounding boxes and labels on image
        for d in defects:
            x1, y1 = int(d["box"][0] * width), int(d["box"][1] * height)
            x2, y2 = int(d["box"][2] * width), int(d["box"][3] * height)
            
            # Select color (BGR format) based on severity
            if d["severity"] == "high":
                color = (0, 0, 255)  # Red
            elif d["severity"] == "medium":
                color = (0, 165, 255)  # Orange
            else:
                color = (0, 255, 255)  # Yellow
                
            # Draw box
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)
            
            # Draw banner for text
            label = f"{d['type'].upper()} ({int(d['confidence']*100)}%)"
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(img, (x1, y1 - h - 10), (x1 + w, y1), color, -1)
            
            # Write text label
            cv2.putText(img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
            
        cv2.imwrite(output_path, img)
        return defects

    def _run_yolo_detection(self, image_path: str, output_path: str) -> list:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image at {image_path}")
            
        height, width, _ = img.shape
        
        # Run YOLO inference (returns list of Results objects)
        results = self.model(image_path)
        defects = []
        
        # Map default COCO model outputs to defect representations
        for result in results:
            boxes = result.boxes
            for box in boxes:
                coords = box.xyxyn[0].tolist()  # [x_min, y_min, x_max, y_max] normalized
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                cls_name = self.model.names[cls_id]
                
                # Filter out low confidence detections
                if conf < 0.25:
                    continue
                    
                # Creative mapping of COCO objects to simulated manufacturing defects
                if cls_name == "person":
                    defect_type = "safety hazard (human)"
                    severity = "high"
                elif cls_name in ["cup", "bottle"]:
                    defect_type = "misalignment"
                    severity = "medium"
                elif cls_name == "keyboard":
                    defect_type = "missing component"
                    severity = "high"
                elif cls_name == "cell phone":
                    defect_type = "foreign object"
                    severity = "high"
                else:
                    # Hash mappings based on ID
                    defect_types = ["scratch", "dent", "crack", "paint defect", "rust", "anomaly"]
                    defect_type = defect_types[cls_id % len(defect_types)]
                    severity = "low" if cls_id % 3 == 0 else ("medium" if cls_id % 3 == 1 else "high")
                
                defects.append({
                    "type": defect_type,
                    "confidence": round(conf, 2),
                    "box": coords,
                    "severity": severity
                })
                
        # Draw bounding boxes and labels
        for d in defects:
            x1, y1 = int(d["box"][0] * width), int(d["box"][1] * height)
            x2, y2 = int(d["box"][2] * width), int(d["box"][3] * height)
            
            if d["severity"] == "high":
                color = (0, 0, 255)
            elif d["severity"] == "medium":
                color = (0, 165, 255)
            else:
                color = (0, 255, 255)
                
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)
            label = f"{d['type'].upper()} ({int(d['confidence']*100)}%)"
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(img, (x1, y1 - h - 10), (x1 + w, y1), color, -1)
            cv2.putText(img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
            
        cv2.imwrite(output_path, img)
        return defects
