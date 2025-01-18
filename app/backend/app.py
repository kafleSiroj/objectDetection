import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import uuid
import shutil
from flask import Flask, jsonify, render_template, request, session, redirect, url_for
from werkzeug.utils import secure_filename
from flask_session import Session
from Classifier.yolo_classifier import ImageClassifier


app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_FILE_DIR'] = 'app/frontend/static/flask_session'
app.config['SESSION_USE_SIGNER'] = True
app.secret_key = os.getenv("secretKey")

Session(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_session_id():
    if 'user_session_id' not in session:
        session['user_session_id'] = str(uuid.uuid4()) 
    return session['user_session_id']


def upload_dir():
    user_session_id = get_user_session_id()
    user_upload_dir = os.path.join(app.config['SESSION_FILE_DIR'], user_session_id, 'uploads')

    if not os.path.exists(user_upload_dir):
        os.makedirs(user_upload_dir)

    return user_upload_dir

def output_dir():
    user_session_id = get_user_session_id()
    user_output_dir = os.path.join(app.config['SESSION_FILE_DIR'], user_session_id, 'output')

    if not os.path.exists(user_output_dir):
        os.makedirs(user_output_dir)

    return user_output_dir


@app.route('/')
def objDetection():
    return render_template("describerbot.html")

@app.route('/upload-image', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        upload_path = output_dir()
        filepath = os.path.join(upload_path, filename)
        file.save(filepath)
        relative_output_path = upload_path.split("app/frontend/")[-1]

        
        file_url = f"{relative_output_path}/{filename}"
        return jsonify({"message": "File uploaded successfully", "filepath": file_url})
    else:
        return jsonify({"error": "File type not allowed"}), 400

@app.route("/get-bot-message", methods=["POST"])
def get_bot_message():
    user_message = request.json.get('message', '')  

    if user_message:
        bot_response = f"Please upload an Image!"
        return jsonify({'message': bot_response})
    else:
        last_image = "app/frontend/" + request.json.get('file_url', '')

        if last_image:
            model = ImageClassifier(last_image)
            textOutput = model.textResponse()
            output_path = output_dir()
            labeled = model.save_labeled_image(output_path)  # Save the labeled image
            bot_response = textOutput
            relative_output_path = output_path.split("app/frontend/")[-1]
            labeled_image_url = f"{relative_output_path}/{os.path.basename(labeled)}"

            response = jsonify({"message": bot_response, "labeled_image": labeled_image_url})

            return response

        else:
            bot_response = "No image uploaded yet."
            return jsonify({"message": bot_response})

@app.route('/clear', methods=['POST'])
def clear():
    dir = output_dir().rstrip('/output')
    shutil.rmtree(dir) 
    return redirect(url_for('objDetection')) 

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
