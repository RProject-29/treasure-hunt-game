#!/bin/bash
echo "Installing Server Dependencies..."
cd server && npm install && cd ..

echo "Installing Client Dependencies..."
cd client && npm install && cd ..

echo "Starting Server and Client..."
cd server && npm start & 
cd client && npm run dev &
wait
