# 🚀 Commit Workflow for libre-glucose-monitor

## ✅ Pre-Commit Checklist

**Run these checks ONLY when you've made changes or suspect compilation issues:**

### 1. **Compilation Check** (REQUIRED - Only when making changes)
```bash
npm run build
```
- ✅ Must complete successfully
- ❌ **NO COMMITS** if build fails
- Fix all TypeScript compilation errors first

### 2. **Development Server Test** (REQUIRED - Only when making changes)
```bash
npm start
```
- ✅ Must start without errors
- ✅ Must be accessible at http://localhost:3000
- ❌ **NO COMMITS** if server fails to start

### 3. **Pre-Commit Script** (ONLY when needed)
```bash
npm run pre-commit
```
- ✅ Runs compilation and linting checks
- ✅ Provides clear feedback on issues
- ✅ **Only use when you've made code changes**
- ✅ **Skip if no changes or working on existing stable code**

### 4. **Manual Verification** (REQUIRED - Only when making changes)
- ✅ App loads in browser
- ✅ No console errors
- ✅ All features working as expected
- ✅ Insulin calculator functionality working

## 🚨 When to Run Pre-Commit Checks

### **RUN Pre-Commit When:**
- ✅ **Adding new features** or components
- ✅ **Modifying existing code** that could break compilation
- ✅ **Adding new imports** or dependencies
- ✅ **Changing TypeScript interfaces** or types
- ✅ **After resolving merge conflicts**
- ✅ **When switching between branches** with different code

### **SKIP Pre-Commit When:**
- ✅ **No code changes** made
- ✅ **Working on existing stable code**
- ✅ **Just viewing or testing** the application
- ✅ **Documentation updates** only
- ✅ **Git operations** (branch switching, etc.)

## 📋 Smart Commit Process

### **Step 1: Development**
```bash
# Make your changes
git add .
```

### **Step 2: Quick Assessment**
**Ask yourself: "Did I make code changes that could break compilation?"**

- **If YES** -> Run pre-commit checks
- **If NO** -> Skip to Step 4

### **Step 3: Pre-Commit Check (Only if needed)**
```bash
npm run pre-commit
```

### **Step 4: Manual Test (Only if needed)**
```bash
npm start
# Test in browser only if you made changes
# Check console for errors
```

### **Step 5: Commit**
```bash
git commit -m "✅ Descriptive commit message"
```

### **Step 6: Push**
```bash
git push origin main
```

## 🔍 Quick Health Check

### **Before Committing Code Changes:**
```bash
# Quick compilation check
npm run build

# Quick server test (only if needed)
npm start &
sleep 10
curl -s http://localhost:3000 | head -5
pkill -f "react-scripts"
```

### **For Documentation/Config Changes:**
```bash
# Skip compilation checks
git commit -m "📚 Update documentation"
```

## 📚 Best Practices

1. **Smart Testing**
   - Test compilation only when making code changes
   - Skip unnecessary checks for stable code

2. **Efficient Workflow**
   - Don't run pre-commit for every git operation
   - Use it strategically when needed

3. **Risk Assessment**
   - Evaluate what could break before running checks
   - Focus on high-risk changes

4. **Regular Health Checks**
   - Run full checks periodically (weekly/monthly)
   - Don't let issues accumulate

## 🎯 Remember

**The goal is to maintain a stable, working main branch while being efficient:**

- ✅ **Code changes** -> Run pre-commit checks
- ✅ **No code changes** -> Skip unnecessary checks
- ❌ **Broken code** -> Never commit (always fix first)
- 🚫 **Never commit broken code** regardless of workflow

---

*This workflow balances code quality with development efficiency.*
