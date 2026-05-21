# TRINETRA 👁️

**AI-Powered Online Exam Proctoring System**

TRINETRA is a robust, secure, and intelligent online examination platform designed to ensure academic integrity through advanced AI proctoring features. It provides real-time monitoring, environment analysis, and a secure testing environment for students, alongside comprehensive control and reporting dashboards for administrators.

## 🚀 Features

### For Administrators/Instructors
* **Custom Exam Controls:** Create, configure, and manage exams with fine-grained settings.
* **Smart Proctoring Dashboard:** Real-time monitoring of active test-takers.
* **AI-Powered Threat Detection:** Automatic flagging of suspicious activities using computer vision and AI.
* **Comprehensive Reporting:** Detailed post-exam reports, including AI-generated insights and flagged activity logs.
* **Real-time Intervention:** Ability to warn or terminate exams for students violating rules.

### For Students
* **Secure Testing Environment:** Integrated Monaco editor for coding exams and standard formats for theoretical questions.
* **Real-time Connection:** Seamless and instant communication with the server via WebSocket.
* **Smart Proctoring Validation:** Continuous webcam and environment monitoring to ensure compliance.
  * **Co-presence Detection:** Detects if multiple people are in the frame.
  * **Mobile Phone Detection:** Flags the use of unauthorized devices.

## 💻 Tech Stack

### Frontend
* **Framework:** React 19 with Vite
* **Routing:** React Router DOM
* **Real-time Communication:** Socket.IO Client
* **Code Editor:** Monaco Editor
* **Icons:** Lucide React

### Backend
* **Runtime:** Node.js with Express.js
* **Database:** MongoDB (Mongoose ODM)
* **Real-time Communication:** Socket.IO
* **AI Integration:** Google GenAI SDK
* **Security:** Helmet, Express Rate Limit, JWT (JSON Web Tokens), Bcryptjs
* **File Handling:** Multer, Cloudinary

## 🛠️ Getting Started

### Prerequisites
* Node.js (v18 or higher recommended)
* MongoDB instance (Local or Atlas)
* Google Gemini API Key
* Cloudinary Account (for media storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TRINETRA
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_google_genai_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
   Start the backend server:
   ```bash
   npm run dev
   ```

3. **Frontend Setup**
   Open a new terminal window:
   ```bash
   cd frontend
   npm install
   ```
   Start the frontend development server:
   ```bash
   npm run dev
   ```

## 📜 License
This project is proprietary and confidential.
