"""Crea base-de-datos/usuarios.db a partir de schema.sql. Se ejecuta una sola vez."""
# Autor: David Estiven Sánchez Yomayuza
import os
import sqlite3

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
conexion = sqlite3.connect(os.path.join(BASE_DIR, "usuarios.db"))
with open(os.path.join(BASE_DIR, "schema.sql"), encoding="utf-8") as archivo:
    conexion.executescript(archivo.read())
conexion.commit()
conexion.close()
print("Base de datos lista en base-de-datos/usuarios.db")
