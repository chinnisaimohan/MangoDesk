# Mangodesk Setup Instructions

## Prerequisites
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- A Gmail account with 2-Step Verification enabled
- A Groq API key

---

## 1. Clone or Download the Project
Place the project folder (`Mangodesk`) on your desktop or desired location.

---

## 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```
   cd Mangodesk/backend
   ```
2. Install dependencies:
   ```
   npm install
   npm install express
   ```
3. Create a `.env` file in the `backend` folder with the following content:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_16_char_gmail_app_password
   JWT_SECRET=your_custom_secret
   ```
   - **EMAIL_PASS**: Generate a 16-character App Password from https://myaccount.google.com/apppasswords
   - **Do NOT use your normal Gmail password!**
4. Start the backend server:
   ```
   npm run
   ```
   - You should see: `Server running on port 3000`

---

## 3. Groq API

For more information about Groq API calls and integration, please refer to the official Groq API Quickstart documentation:  
https://console.groq.com/docs/quickstart

---

## 4. Frontend Setup
1. Open the `frontend/index.html` file in your web browser (double-click or right-click > Open with... > your browser).
2. The app will load in your browser.

---

## 5. Deployment

- The backend and frontend are deployed on [Render](https://render.com/).
- Live site: [https://mangodesk-1.onrender.com](https://mangodesk-1.onrender.com)

---

## 6. Using the App
1. **Register** with your email and password.
2. **Check your email** for a verification link and click it.
3. **Log in** with your verified email and password.
4. **Upload a transcript** and enter a prompt (or leave blank for default summary).
5. **Edit the summary** if needed.
6. **Share the summary** via email (enter recipient emails, separated by commas).

---

## Troubleshooting
- If you do not receive verification emails:
  - Double-check your `.env` settings, especially `EMAIL_USER` and `EMAIL_PASS`.
  - Make sure you are using a Gmail App Password, not your normal password.
  - Check your spam/junk folder.
  - Try sending a test email using the provided `test-email.js` script.
- If the backend server crashes, check the terminal for error messages and fix any issues with your `.env` or dependencies.

---

## Notes
- For production, use a real database and a production email provider.
- Keep your `.env` file secure and never commit it to public repositories.

---

For more details, see `Project_Documentation.txt` in the project folder.

---

## Citation

Groq, Inc. (n.d.). Groq API Quickstart. Retrieved from https://console.groq.com/docs/quickstart

MangoDesk Project Documentation. (n.d.). Retrieved from /Project_Documentation.txt
