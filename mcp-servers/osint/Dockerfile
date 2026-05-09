FROM python:3.11-slim

WORKDIR /app

COPY ../../phishslayer-api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir mcp>=1.0.0

COPY ../../phishslayer-api ./phishslayer_api
COPY . ./mcp_server

ENV PYTHONPATH=/app/phishslayer_api

EXPOSE 9001
CMD ["python", "/app/mcp_server/server.py"]
