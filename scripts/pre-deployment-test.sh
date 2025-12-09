#!/bin/bash

echo "🔍 Pre-Deployment Safety Check"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Function to test
test_check() {
  local name="$1"
  local command="$2"
  
  echo -n "Testing: $name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    return 1
  fi
}

warn_check() {
  local name="$1"
  local command="$2"
  
  echo -n "Checking: $name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    ((WARNINGS++))
  fi
}

echo "📦 1. Environment Checks"
echo "------------------------"
test_check "Node.js installed" "node --version"
test_check "npm installed" "npm --version"
test_check "Redis installed" "redis-cli --version"
warn_check "Docker installed" "docker --version"
echo ""

echo "🔧 2. Backend Checks"
echo "--------------------"
test_check "Backend dependencies" "[ -d packages/backend/node_modules ]"
test_check "Backend .env exists" "[ -f packages/backend/.env ]"
test_check "Backend TypeScript compiles" "cd packages/backend && npx tsc --noEmit"
warn_check "Backend tests exist" "[ -f packages/backend/src/**/*.test.ts ]"
echo ""

echo "🎨 3. Frontend Checks"
echo "---------------------"
test_check "Frontend dependencies" "[ -d packages/frontend/node_modules ]"
test_check "Frontend builds" "cd packages/frontend && npm run build"
warn_check "Frontend has no console.log" "! grep -r 'console\.log' packages/frontend/src --include='*.tsx' --include='*.ts'"
echo ""

echo "🔒 4. Security Checks"
echo "---------------------"
warn_check "No .env in git" "! git ls-files | grep -q '\.env$'"
test_check ".gitignore includes .env" "grep -q '\.env' .gitignore"
test_check "JWT secret is set" "grep -q 'JWT_SECRET' packages/backend/.env"
warn_check "Strong JWT secret" "grep 'JWT_SECRET' packages/backend/.env | grep -v 'your-secret-key'"
warn_check "npm audit clean (backend)" "cd packages/backend && npm audit --production --audit-level=moderate"
warn_check "npm audit clean (frontend)" "cd packages/frontend && npm audit --production --audit-level=moderate"
echo ""

echo "🌐 5. Network Checks"
echo "--------------------"
if lsof -i :6379 > /dev/null 2>&1; then
  echo -e "Redis running on 6379... ${GREEN}✓ OK${NC}"
  ((PASSED++))
else
  echo -e "Redis NOT running on 6379... ${YELLOW}⚠ WARNING${NC}"
  ((WARNINGS++))
fi

if lsof -i :3333 > /dev/null 2>&1; then
  echo -e "Backend running on 3333... ${GREEN}✓ OK${NC}"
  ((PASSED++))
else
  echo -e "Backend NOT running on 3333... ${YELLOW}⚠ WARNING${NC}"
  ((WARNINGS++))
fi

if lsof -i :5173 > /dev/null 2>&1; then
  echo -e "Frontend running on 5173... ${GREEN}✓ OK${NC}"
  ((PASSED++))
else
  echo -e "Frontend NOT running on 5173... ${YELLOW}⚠ WARNING${NC}"
  ((WARNINGS++))
fi
echo ""

echo "📊 6. Service Health Checks"
echo "---------------------------"
if curl -s http://localhost:3333/health > /dev/null 2>&1; then
  echo -e "Backend health endpoint... ${GREEN}✓ OK${NC}"
  ((PASSED++))
else
  echo -e "Backend health endpoint... ${RED}✗ FAIL${NC}"
  ((FAILED++))
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "Frontend accessible... ${GREEN}✓ OK${NC}"
  ((PASSED++))
else
  echo -e "Frontend accessible... ${RED}✗ FAIL${NC}"
  ((FAILED++))
fi

if redis-cli ping > /dev/null 2>&1; then
  echo -e "Redis responding... ${GREEN}✓ OK${NC}"
  ((PASSED++))
else
  echo -e "Redis responding... ${RED}✗ FAIL${NC}"
  ((FAILED++))
fi
echo ""

echo "📁 7. File Structure Checks"
echo "---------------------------"
test_check "README.md exists" "[ -f README.md ]"
test_check "DEPLOYMENT_GUIDE.md exists" "[ -f DEPLOYMENT_GUIDE.md ]"
test_check "Backend README exists" "[ -f packages/backend/README.md ]"
test_check "Frontend README exists" "[ -f packages/frontend/README.md ]"
test_check "Docker compose exists" "[ -f docker-compose.yml ] || [ -f docker-compose.prod.yml ]"
echo ""

echo "🧪 8. Code Quality Checks"
echo "-------------------------"
warn_check "TypeScript strict mode (backend)" "grep '\"strict\": true' packages/backend/tsconfig.json"
warn_check "TypeScript strict mode (frontend)" "grep '\"strict\": true' packages/frontend/tsconfig.json"
warn_check "ESLint config exists (backend)" "[ -f packages/backend/.eslintrc.js ] || [ -f packages/backend/.eslintrc.json ]"
warn_check "Prettier config exists" "[ -f .prettierrc ] || [ -f .prettierrc.json ]"
echo ""

echo "================================"
echo "📊 SUMMARY"
echo "================================"
echo -e "${GREEN}✓ Passed:${NC} $PASSED"
echo -e "${RED}✗ Failed:${NC} $FAILED"
echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))
SCORE=$((PASSED * 100 / TOTAL))

echo "Score: $SCORE%"
echo ""

if [ $FAILED -eq 0 ]; then
  if [ $SCORE -ge 90 ]; then
    echo -e "${GREEN}🎉 EXCELLENT! Ready for deployment.${NC}"
    exit 0
  elif [ $SCORE -ge 75 ]; then
    echo -e "${YELLOW}⚠️  GOOD, but consider fixing warnings.${NC}"
    exit 0
  else
    echo -e "${YELLOW}⚠️  NEEDS IMPROVEMENT before deployment.${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ CRITICAL FAILURES! Fix before deployment.${NC}"
  exit 1
fi

