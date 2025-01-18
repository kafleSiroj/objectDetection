from ultralytics import YOLO
import cv2
from PIL import Image
import os

model = YOLO("yolo/yolo11x.pt")

class ImageClassifier:
    def __init__(self, path: str) -> None:
        self.path = path
        self.results = model(self.path)

    def summary(self):
        self.objects = {}
        for result in self.results[0].boxes:
            class_idx = int(result.cls.item())
            class_name = self.results[0].names[class_idx]
            confidence = result.conf.item()
        
            if class_name in self.objects:
                self.objects[class_name][0] += 1
                self.objects[class_name][1] = (self.objects[class_name][1] + confidence) / 2
            else:
                self.objects[class_name] = [1, confidence]

        return self.objects

    def textResponse(self):
        desc = []
        obj = self.summary()
        
        for object, vals in obj.items():
            counts, _ = vals
            desc.append(f"{counts} {object}")
        
        if not desc:
            return "Sorry, I couldn't detect any objects."
        
        output = ''
        for indx in range(len(desc)):
            output += f"{indx+1}) {desc[indx]}\n"

        return f"Detected objects:\n{output}"

    def save_labeled_image(self, output_folder):
        labeled_image = self.results[0].plot() 
        labeled_image = cv2.cvtColor(labeled_image, cv2.COLOR_BGR2RGB)
        labeled_image = Image.fromarray(labeled_image)

 
        image_filename = os.path.basename(self.path) 
        output_path = f"{output_folder}/labeled_{image_filename}"
        labeled_image.save(output_path)
        
        return output_path