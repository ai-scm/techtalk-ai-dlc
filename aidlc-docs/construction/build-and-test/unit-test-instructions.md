# Unit Test Execution — Dog Keeper Platform

**Generated**: 2026-07-07
**Stage**: CONSTRUCTION — Build and Test

---

## Unit 1: Backend API

### Run Tests
```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

### Expected Results
- Tests validate: auth service, pet service, adoption service, repositories
- Coverage target: >60% on business logic (services/)
- Framework: pytest

---

## Unit 2: BFF

### Run Tests
```bash
cd bff
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

### Expected Results
- Tests validate: proxy logic, auth flow, response adaptation
- Coverage target: >60% on business logic
- Framework: pytest

---

## Unit 3: Frontend

### Run Tests
```bash
cd frontend
npm install
npm test
```

### Expected Results
- Tests validate: components render, API service calls, form validations
- Framework: Vitest + React Testing Library
- Coverage target: >60% on components with business logic

---

## Unit 4: Infrastructure (CDK)

### Run Tests
```bash
cd infra/cdk
npm install
npm test
```

### Expected Results
- Tests validate: resource count, naming, IAM policies, tags, pipeline stages
- Framework: Jest + CDK Assertions
- 25+ assertions covering all constructs

---

## Run All Unit Tests (Garden)

```bash
# Run all unit tests via Garden
garden test

# Run specific unit tests
garden test unit-backend
garden test unit-bff
```

---

## Test Coverage Report

| Unit | Tool | Coverage Target | Key Areas |
|---|---|---|---|
| Backend | pytest + coverage | >60% | services/, repositories/ |
| BFF | pytest + coverage | >60% | routers/, client/ |
| Frontend | Vitest | >60% | features/, components/ |
| CDK | Jest + CDK Assertions | N/A (structural) | All constructs |
