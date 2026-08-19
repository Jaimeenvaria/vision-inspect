import os
import shutil
import logging
import uuid
import cloudinary
import cloudinary.uploader

logger = logging.getLogger("factoryvision.storage")

class StorageService:
    def __init__(self):
        self.cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        self.api_key = os.getenv("CLOUDINARY_API_KEY")
        self.api_secret = os.getenv("CLOUDINARY_API_SECRET")
        
        self.enabled = bool(
            self.cloud_name and self.cloud_name != "your_cloud_name" and
            self.api_key and self.api_key != "your_api_key" and
            self.api_secret and self.api_secret != "your_api_secret"
        )
        
        if self.enabled:
            try:
                cloudinary.config(
                    cloud_name=self.cloud_name,
                    api_key=self.api_key,
                    api_secret=self.api_secret,
                    secure=True
                )
                logger.info("Cloudinary storage service configured successfully.")
            except Exception as e:
                logger.error(f"Failed to configure Cloudinary: {e}. Falling back to local storage.")
                self.enabled = False
        else:
            logger.info("Cloudinary credentials not configured. Using local static file storage.")

    def upload_image(self, file_path: str, folder: str = "inspections") -> tuple[str, str]:
        """
        Uploads image file to storage.
        Returns:
            tuple (url: str, provider: str)
            provider is either "cloudinary" or "local"
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at {file_path}")
            
        if self.enabled:
            try:
                # Upload to Cloudinary
                response = cloudinary.uploader.upload(
                    file_path,
                    folder=f"factoryvision/{folder}",
                    resource_type="image"
                )
                url = response.get("secure_url")
                if url:
                    logger.info(f"File uploaded to Cloudinary: {url}")
                    return url, "cloudinary"
            except Exception as e:
                logger.error(f"Cloudinary upload failed: {e}. Falling back to local storage.")
                
        # Local Storage Fallback
        try:
            filename = os.path.basename(file_path)
            # Add unique prefix to prevent overwrite collisions
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            
            # Destination path
            dest_dir = os.path.join("backend", "static", "uploads")
            os.makedirs(dest_dir, exist_ok=True)
            dest_path = os.path.join(dest_dir, unique_filename)
            
            shutil.copy2(file_path, dest_path)
            
            # Return relative path for server resolution
            local_url = f"/static/uploads/{unique_filename}"
            logger.info(f"File stored locally: {local_url}")
            return local_url, "local"
        except Exception as e:
            logger.error(f"Local storage write failed: {e}")
            raise IOError(f"Failed to save uploaded file locally: {e}")
