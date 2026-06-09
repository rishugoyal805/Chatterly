![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)


# ChatterlyAI — Full Multi-Service Open Source AI Chat Platform

ChatterlyAI is a full-stack AI chat system built with a **Next.js frontend** and **three independent backend services**, deployed separately due to platform constraints (Vercel + Render free tiers).

# Project Screenshots
![Homepage](https://github.com/user-attachments/assets/32e8fdfb-a236-4833-877f-b283ee983d17)
![Dashboard](https://github.com/user-attachments/assets/3d858362-0683-4815-9c48-c7215479365a)
![Features](https://github.com/user-attachments/assets/71843d98-d95c-43a9-a6b9-9df8abf4e464)
![AI Text](https://github.com/user-attachments/assets/953e1d9d-7fc8-43d2-a4f9-69def2aac7b5)
![Share](https://github.com/user-attachments/assets/653783f2-5a10-482f-9cec-1c1b8b345ad7)
![Image Generated](https://github.com/user-attachments/assets/a006609d-e60f-46bc-a056-0efea23311c9)
![Add Friend](https://github.com/user-attachments/assets/714c4549-f570-4c85-9bfb-914eff63a01d)
![Chat With Friends](https://github.com/user-attachments/assets/bce4bfad-2808-4739-931c-2b76c9af3cd0)

<!--![Homepage](https://github.com/user-attachments/assets/cb131514-0eec-4562-832b-7e54c380f48b)
![Dashboard](https://github.com/user-attachments/assets/84acc733-b1a5-498f-8a85-bf642468346e)
![Features](https://github.com/user-attachments/assets/d97b5bb5-3ee3-4d1f-84d9-370b72b43029)
![AI Text](https://github.com/user-attachments/assets/ec9efbe3-b2b2-4a11-9d4d-1ed062fc7f9a)
![Share](https://github.com/user-attachments/assets/3183846b-0198-4f74-ac9d-463babf54e9b)
![Image Generated](https://github.com/user-attachments/assets/aeb22808-3533-4120-bf39-a9a75d288705)
![Chat With Friends](https://github.com/user-attachments/assets/ef71f168-df6c-4209-bbc8-9f0612dbfc10)
![Profile](https://github.com/user-attachments/assets/ff424b15-c4f0-4406-b267-6ee830c1b686).
-->
## What this project does
ChatterlyAI is a full-stack, collaborative AI chat platform that lets multiple users interact with AI in real-time.
It integrates a Next.js frontend with three independent backend services, providing a seamless chat experience without switching apps or refreshing pages.
The system is designed to be easy to set up and extend, allowing contributors to experiment, modify, and enhance the platform collaboratively.

This repository contains:
- The **official frontend**
- All **system documentation**
- Links to all backend microservices
- Setup guides for contributors

Live App → https://chatterlyai.vercel.app

---

## 📌 System Architecture
ChatterlyAI consists of **4 repositories working together**:

| Service | Repo Link | Tech | Deploy |
|--------|-----------|------|--------|
| Frontend (Main) | https://github.com/rishugoyal805/ChatterlyAI.git | Next.js | Vercel |
| Backend API | https://github.com/rishugoyal805/ChatterlyAI_Backend_1.git | Node.js | Render |
| Secondary Backend | https://github.com/rishugoyal805/ChatterlyAI_Backend_2.git | Node.js | Render |
| Agentic Backend | https://github.com/rishugoyal805/ChatterlyAI_Agentic.git | Python/CrewAI | Render |

Full architecture → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

---

## 🚀 Local Development

If you want to run everything locally, start the services in this order: Backend 1 → Backend 2 → Agentic → Frontend.

### 1. Start Backend 1  
Follow instructions here: https://github.com/rishugoyal805/ChatterlyAI_Backend_1.git
Can run on localhost: 3001
Follow repo instructions: npm install → npm run dev → node server-socket.js

### 2. Start Backend 2  
Follow instructions here: https://github.com/rishugoyal805/ChatterlyAI_Backend_2.git
Can run on localhost: 3002
Follow repo instructions: npm install → npm run dev → node server-socket.js

### 3. Start Agentic Service 
Follow instructions here: https://github.com/rishugoyal805/ChatterlyAI_Agentic.git
Can run on localhost: 8080
Follow repo instructions: pip install -r requirements.txt → uvicorn backend:app 8080 --reload

### 4. Start Frontend  

## Environment Variables
Can run on localhost: 3000
Rename `.env.example` to `.env.local` and fill values for local development:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your_nextauth_secret>

MONGODB_URI=<your_mongodb_connection_string>
MONGODB_DB=<your_database_name>

JWT_SECRET=<your_jwt_secret>

GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>

HF_API_KEY=<your_huggingface_api_key>

CLOUDINARY_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_SECRET=<your_cloudinary_api_secret>
CLOUDINARY_URL=cloudinary://<your_cloudinary_api_key>:<your_cloudinary_api_secret>@<your_cloudinary_cloud_name>

NEXT_PUBLIC_AGENTIC_BACKEND_URL=<your_agentic_backend_url> 
NEXT_PUBLIC_AI_SOCKET_BACKEND_URL=<your_ai_socket_backend_url>
NEXT_PUBLIC_CHAT_SOCKET_BACKEND_URL=<your_chat_socket_backend_url>
```

Clone the repository and install dependencies:

```bash
git clone https://github.com/rishugoyal805/ChatterlyAI.git
cd ChatterlyAI
npm install    
```

### Development

```bash
npm run dev
```
### Note: Make sure backend URLs in your environment variables match the ports above. Check CORS settings if requests fail.
It doesn't matter which ports you run the services on, just make sure URLs in your environment variables are correct and CORS settings allow requests.

---

## 🧩 Contributing
Contributions are welcome!  
Start here → [`CONTRIBUTING.md`](./CONTRIBUTING.md)

If you're new:
- Check `good-first-issues`
- Open small PRs
- Ask questions in Issues

---  
## 🗺 Roadmap
See → [`docs/ROADMAP.md`](./docs/ROADMAP.md)

---
  
## 📜 License
This project is licensed under the CC BY-NC 4.0 License.  
You may use, modify, and share it for non-commercial purposes with attribution.
