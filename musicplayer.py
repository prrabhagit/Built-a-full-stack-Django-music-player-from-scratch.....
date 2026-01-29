from flask import Flask, render_template, send_from_directory, jsonify
import os
app=Flask(_Music Player_)
SONG_FOLDER= os.path.join(app.static_folder, "songs")
