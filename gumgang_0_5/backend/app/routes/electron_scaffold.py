from fastapi import APIRouter
from scripts.electron_scaffold_creator import create_electron_files
import subprocess

router = APIRouter()

@router.post("/create_electron_scaffold")
def create_electron_scaffold():
    result = create_electron_files()
    subprocess.Popen(["code", "/home/duksan/바탕화면/gumgang_2_0/electron"])
    return result
