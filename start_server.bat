@echo off
echo Installing required packages...
pip install -r requirements.txt

echo Starting DMTribut game server...
python server.py

pause 