FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy Python package files
COPY python/ /app/leverage/

# Install Python package in virtual environment
RUN cd /app/leverage && \
    pip install --upgrade pip setuptools wheel && \
    pip install -e . && \
    python3 -c "import enhanced_leverage_system; print('enhanced_leverage_system module installed successfully')"

# Copy frontend files
COPY . /app/

# Expose ports
EXPOSE 8000
EXPOSE 5001

# Start servers
CMD ["./dev.bat"]