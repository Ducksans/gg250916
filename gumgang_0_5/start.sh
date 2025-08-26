#!/bin/bash
cd backend
uvicorn main:app --port 8001 --reload &
sleep 2
cd ../frontend
npm install
npm run dev
