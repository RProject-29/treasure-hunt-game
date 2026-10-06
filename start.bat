@echo off
echo Installing Server Dependencies...
cd server
call npm install
cd ..

echo Installing Client Dependencies...
cd client
call npm install
cd ..

echo Starting Server and Client...
start cmd /k "cd server && npm start"
start cmd /k "cd client && npm run dev"
