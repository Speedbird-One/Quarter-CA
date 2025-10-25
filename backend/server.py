import os
import sys  # Added for exiting
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# --- NEW: Added a try/except block for the import ---
try:
    from analyze_financials import run_analysis
except Exception as e:
    print("--- CRITICAL ERROR ---")
    print(f"Failed to import 'analyze_financials.py': {e}")
    print("Please check that file for syntax errors or issues.")
    input("Press Enter to exit...")
    sys.exit(1)  # Stop the script
# --- END NEW ---

# --- Configuration ---
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"xlsx"}  # Only allow xlsx
MAX_FILES = 5

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Enable CORS (Cross-Origin Resource Sharing)
CORS(app)


# --- Helper Function ---
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# --- NEW: Added a try/except block for directory creation ---
try:
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
except OSError as e:
    print("--- CRITICAL ERROR ---")
    print(f"Failed to create the '{UPLOAD_FOLDER}' directory.")
    print(f"Error: {e}")
    print("Please check your folder permissions or run as administrator.")
    input("Press Enter to exit...")
    sys.exit(1)  # Stop the script
# --- END NEW ---


# --- API Endpoint ---
@app.route("/analyze", methods=["POST"])
def analyze_file():
    # 1. Check if files were sent
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    # Get a list of files
    files = request.files.getlist("file")

    if not files or files[0].filename == "":
        return jsonify({"error": "No files selected"}), 400

    if len(files) > MAX_FILES:
        return (
            jsonify({"error": f"You can upload a maximum of {MAX_FILES} files."}),
            400,
        )

    file_paths = []
    result = {}

    try:
        # 2. Check each file, save valid ones
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                file.save(file_path)
                file_paths.append(file_path)
            else:
                return (
                    jsonify(
                        {
                            "error": "File type not allowed. Please upload only .xlsx files"
                        }
                    ),
                    400,
                )

        # 3. Run analysis logic
        result = run_analysis(file_paths)

        # 5. Return the JSON result
        if "error" in result:
            return jsonify(result), 500

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"An internal error occurred: {e}"}), 500

    finally:
        # 4. Clean up all uploaded files
        for fp in file_paths:
            if os.path.exists(fp):
                os.remove(fp)


# --- Run the Server ---
if __name__ == "__main__":
    print("Starting Flask server on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
