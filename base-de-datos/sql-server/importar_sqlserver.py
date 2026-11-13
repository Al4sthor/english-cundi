"""Copia los usuarios de un archivo SQLite (usuarios.db) a SQL Server.

Autor: David Estiven Sánchez Yomayuza

Uso (desde la carpeta base-de-datos/sql-server):
    py importar_sqlserver.py
(sin ruta, toma Descargas\\usuarios.db; o pasa otra ruta entre comillas)

1. En PythonAnywhere -> Files -> english-cundi/base-de-datos/ descarga usuarios.db.
2. Ejecuta este script con la ruta del archivo descargado.
3. Abre SQL Server Management Studio -> base EnglishCundi -> dbo.usuarios.

Usa sqlcmd con autenticación de Windows; no necesita instalar librerías.
"""
import os
import sqlite3
import subprocess
import sys
import tempfile

SERVIDOR = "localhost"
CARPETA = os.path.dirname(os.path.abspath(__file__))


def texto(valor):
    """Literal Unicode de T-SQL con las comillas escapadas."""
    return "N'" + str(valor).replace("'", "''") + "'"


def sqlcmd(archivo):
    resultado = subprocess.run(
        ["sqlcmd", "-S", SERVIDOR, "-E", "-C", "-b", "-f", "65001", "-i", archivo],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if resultado.returncode != 0:
        sys.exit("Error de SQL Server:\n" + resultado.stdout + resultado.stderr)
    return resultado.stdout


def main():
    origen = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser("~"), "Downloads", "usuarios.db")
    if not os.path.isfile(origen):
        sys.exit(f"No encuentro el archivo: {origen}")

    con = sqlite3.connect(f"file:{origen}?mode=ro", uri=True)
    filas = con.execute(
        "SELECT id, correo, nombre, password_hash, creado_en FROM usuarios ORDER BY id"
    ).fetchall()
    con.close()

    # 1) Crear la base y la tabla si no existen.
    sqlcmd(os.path.join(CARPETA, "crear_englishcundi.sql"))

    # 2) Reemplazar el contenido por el del archivo SQLite (copia exacta).
    lineas = ["USE EnglishCundi;", "SET NOCOUNT ON;", "BEGIN TRANSACTION;", "DELETE FROM dbo.usuarios;"]
    for id_, correo, nombre, password_hash, creado_en in filas:
        lineas.append(
            "INSERT INTO dbo.usuarios (id, correo, nombre, password_hash, creado_en) VALUES "
            f"({int(id_)}, {texto(correo)}, {texto(nombre)}, {texto(password_hash)}, {texto(creado_en)});"
        )
    lineas += ["COMMIT;", "SELECT COUNT(*) AS usuarios_copiados FROM dbo.usuarios;"]

    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8-sig") as tmp:
        tmp.write("\n".join(lineas) + "\n")
    try:
        print(sqlcmd(tmp.name).strip())
    finally:
        os.remove(tmp.name)
    print(f"Listo: {len(filas)} usuario(s) copiado(s) de {origen} a SQL Server (base EnglishCundi).")


if __name__ == "__main__":
    main()
