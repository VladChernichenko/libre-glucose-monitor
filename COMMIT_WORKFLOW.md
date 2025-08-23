# 🚀 Commit Workflow for libre-glucose-monitor

## ✅ Pre-Commit Checklist

**ALWAYS run these checks before committing and pushing:**

### 1. **Compilation Check** (REQUIRED)
```bash
npm run build
```
- ✅ Must complete successfully
- ❌ **NO COMMITS** if build fails
- Fix all TypeScript compilation errors first

### 2. **Development Server Test** (REQUIRED)
```bash
npm start
```
- ✅ Must start without errors
- ✅ Must be accessible at http://localhost:3000
- ❌ **NO COMMITS** if server fails to start

### 3. **Pre-Commit Script** (RECOMMENDED)
```bash
npm run pre-commit
```
- ✅ Runs compilation and linting checks
- ✅ Provides clear feedback on issues
- ✅ Exits with error code if compilation fails

### 4. **Manual Verification** (REQUIRED)
- ✅ App loads in browser
- ✅ No console errors
- ✅ All features working as expected
- ✅ Insulin calculator functionality working

## 🚨 Common Issues to Check

### **Import Errors**
- Check all import paths are correct
- Verify new service files exist
- Ensure TypeScript can resolve all modules

### **Type Errors**
- Fix all TypeScript type mismatches
- Ensure interfaces are properly defined
- Check for missing properties

### **Build Artifacts**
- Verify build/ directory is updated
- Check for any missing CSS/JS files
- Ensure no broken references

## 📋 Commit Process

### **Step 1: Development**
```bash
# Make your changes
git add .
```

### **Step 2: Pre-Commit Check**
```bash
npm run pre-commit
```

### **Step 3: Manual Test**
```bash
npm start
# Test in browser
# Check console for errors
```

### **Step 4: Commit Only If All Checks Pass**
```bash
git commit -m "✅ Descriptive commit message"
```

### **Step 5: Final Build Check**
```bash
npm run build
# Must succeed before pushing
```

### **Step 6: Push**
```bash
git push origin main
```

## 🆘 If Build Fails

### **Don't Panic - Follow These Steps:**

1. **Stop and Fix**
   - ❌ **NEVER commit broken code**
   - ❌ **NEVER push compilation errors**

2. **Identify the Issue**
   ```bash
   npm run build
   # Read error messages carefully
   ```

3. **Fix the Problem**
   - Fix TypeScript errors
   - Resolve import issues
   - Update broken references

4. **Re-test**
   ```bash
   npm run build  # Must succeed
   npm start      # Must work
   ```

5. **Then Commit**
   - Only commit after all issues are resolved

## 🔍 Quick Health Check

### **Before Every Commit:**
```bash
# Quick compilation check
npm run build

# Quick server test
npm start &
sleep 10
curl -s http://localhost:3000 | head -5
pkill -f "react-scripts"
```

### **If Any Step Fails:**
- ❌ **STOP** the commit process
- 🔧 **FIX** the issue
- ✅ **RE-TEST** everything
- 🚀 **THEN** commit

## 📚 Best Practices

1. **Small, Focused Commits**
   - One feature per commit
   - Easy to revert if needed

2. **Descriptive Commit Messages**
   - Clear what was changed
   - Include emojis for quick identification

3. **Test-Driven Development**
   - Test features before committing
   - Verify both development and production builds

4. **Regular Health Checks**
   - Run pre-commit script frequently
   - Don't let issues accumulate

## 🎯 Remember

**The goal is to maintain a stable, working main branch at all times.**

- ✅ **Working code** → Commit
- ❌ **Broken code** → Fix first, then commit
- 🚫 **Never commit broken code**

---

*This workflow ensures that our main branch is always stable and deployable.*
