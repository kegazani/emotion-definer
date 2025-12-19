import requests
import sys

try:
    response = requests.get("http://localhost:8000/")
    if response.status_code == 200:
        print("✓ Backend работает!")
        print(f"Ответ: {response.json()}")
    else:
        print(f"✗ Backend вернул код: {response.status_code}")
        sys.exit(1)
except requests.exceptions.ConnectionError:
    print("✗ Не удалось подключиться к backend")
    print("Убедитесь, что backend запущен: uvicorn main:app --reload --port 8000")
    sys.exit(1)
except Exception as e:
    print(f"✗ Ошибка: {e}")
    sys.exit(1)

