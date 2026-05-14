import os
from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from models import db, ChatMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
import uuid

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Configure Database for Vercel (read-only filesystem)
db_url = os.getenv('DATABASE_URL')
if not db_url:
    # If on Vercel and no external DB, use /tmp for SQLite
    if os.getenv('VERCEL'):
        db_url = 'sqlite:////tmp/chat_history.db'
    else:
        db_url = 'sqlite:///chat_history.db'

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')

db.init_app(app)

# Ensure database tables are created
with app.app_context():
    db.create_all()

# LangChain Setup
def get_ai_chain():
    google_key = os.getenv("GOOGLE_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    
    # Prioritize NVIDIA if key is available
    if nvidia_key and nvidia_key != "your_nvidia_api_key_here":
        # Use 8b model for speed to stay within Vercel's 10s timeout limit
        llm = ChatNVIDIA(model="meta/llama-3.1-8b-instruct", nvidia_api_key=nvidia_key)
    elif google_key and google_key != "your_google_api_key_here":
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=google_key)
    else:
        raise ValueError("Missing both GOOGLE_API_KEY and NVIDIA_API_KEY in .env file")
    
    # Using Jinja2 syntax in LangChain ChatPromptTemplate
    template = """
    You are a helpful AI assistant.
    
    Current conversation history:
    {{ history }}
    
    User: {{ input }}
    Assistant:"""
    
    prompt = ChatPromptTemplate.from_template(template, template_format="jinja2")
    return prompt | llm

@app.route('/')
def index():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    return render_template('index.html', mode='landing')

@app.route('/chat-interface')
def chat_interface():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    history = ChatMessage.query.filter_by(session_id=session['session_id']).order_by(ChatMessage.timestamp.asc()).all()
    return render_template('index.html', mode='chat', history=history)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message')
    session_id = session.get('session_id')

    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Load history from DB for this session
        db_history = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
        
        # Format history for the prompt
        formatted_history = ""
        for msg in db_history:
            formatted_history += f"User: {msg.user_message}\nAssistant: {msg.bot_response}\n"

        # Get AI Response
        chain = get_ai_chain()
        response = chain.invoke({"input": user_input, "history": formatted_history})
        bot_response = response.content

        # Save to DB
        new_msg = ChatMessage(
            session_id=session_id,
            user_message=user_input,
            bot_response=bot_response
        )
        db.session.add(new_msg)
        db.session.commit()

        return jsonify({"response": bot_response})

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"CHAT ERROR: {error_details}")
        return jsonify({
            "error": str(e),
            "details": "Check server logs or ensure API keys are correct."
        }), 500

if __name__ == '__main__':
    # When running locally
    app.run(debug=True, port=5001)
else:
    # When running on Vercel/Production
    # Ensure tables are created (optional but helpful for first run)
    with app.app_context():
        db.create_all()
