# Build Instructions — Dog Keeper Platform

**Generated**: 2026-07-07
**Stage**: CONSTRUCTION — Build and Test

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 24.x (via nvm) | Frontend + CDK |
| Python | 3.12.x (via pyenv) | Backend + BFF |
| Docker | Latest | Container builds |
| Minikube | Latest | Local Kubernetes cluster |
| Garden.io | Latest | Orchestration local dev |
| AWS CDK CLI | 2.150.0 | Infrastructure deployment |

---

## Unit 1: Backend API

### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Verify Syntax
```bash
cd backend
python -c "import main"  # Verifies imports resolve
```

### Build Docker Image (local)
```bash
eval $(minikube -p minikube docker-env)
docker build -t backend:latest ./backend
```

---

## Unit 2: BFF

### Install Dependencies
```bash
cd bff
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Verify Syntax
```bash
cd bff
python -c "import main"  # Verifies imports resolve
```

### Build Docker Image (local)
```bash
docker build -t bff:latest ./bff
```

---

## Unit 3: Frontend

### Install Dependencies
```bash
cd frontend
npm install
```

### Build (TypeScript compilation + Vite)
```bash
cd frontend
npm run build
```

### Build Docker Image (local)
```bash
docker build -t frontend:latest --target development ./frontend
```

---

## Unit 4: Infrastructure (AWS CDK)

### Install Dependencies
```bash
cd infra/cdk
npm install
```

### Build (TypeScript compilation)
```bash
cd infra/cdk
npx tsc --noEmit
```

### Synthesize (requires valid config values)
```bash
cd infra/cdk
# First: fill placeholder values in config/test.ts
npx cdk synth
```

---

## Full Local Build (Garden)

### One-Command Build
```bash
# Start minikube
minikube start --addons=ingress

# Point Docker to Minikube
eval $(minikube -p minikube docker-env)

# Build all services
garden build
```

### Full Deploy (local)
```bash
garden deploy
```

### Interactive Development
```bash
garden dev
```

---

## Build Verification

| Unit | Command | Expected Result |
|---|---|---|
| Backend | `python -c "import main"` | No errors |
| BFF | `python -c "import main"` | No errors |
| Frontend | `npm run build` | Build output in `dist/` |
| CDK | `npx tsc --noEmit` | No compilation errors |
| Garden (all) | `garden build` | All 3 images built |

---

## Troubleshooting

### Python Import Errors
```bash
# Ensure you're using correct Python version
pyenv local 3.12
pip install -r requirements.txt
```

### Node.js Version Issues
```bash
# Use nvm to switch
export PATH="/home/nuvu/.local/share/nvm/v24.14.1/bin:$PATH"
```

### Docker Build Fails
```bash
# Ensure Docker points to Minikube
eval $(minikube -p minikube docker-env)
docker info  # Should show Minikube Docker
```

### Garden Build Fails
```bash
# Check Garden status
garden get status
# Check logs
garden logs <service-name>
```
