// 认证工具函数
class AuthUtils {
  constructor() {
    this.isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    this.userRole = localStorage.getItem('userRole');
    this.userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;
  }

  // 检查是否已登录
  checkAuth() {
    return localStorage.getItem('isAuthenticated') === 'true'
      && localStorage.getItem('userInfo') !== null;
  }

  // 获取用户信息
  getUserInfo() {
    const info = localStorage.getItem('userInfo');
    return info ? JSON.parse(info) : null;
  }

  // 获取用户角色
  getUserRole() {
    return localStorage.getItem('userRole');
  }

  // 设置登录状态
  setAuth(userData, role) {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userInfo', JSON.stringify(userData));
    this.isAuthenticated = true;
    this.userRole = role;
    this.userInfo = userData;
  }

  // 清除登录状态
  clearAuth() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userInfo');
    this.isAuthenticated = false;
    this.userRole = null;
    this.userInfo = null;
  }

  // 检查角色权限
  checkRole(requiredRole) {
    return localStorage.getItem('userRole') === requiredRole;
  }

  // 页面加载时检查认证状态
  checkPageAuth(requiredRole = null, redirectUrl = 'index.html') {
    // 如果需要特定角色但用户角色不匹配，重定向
    if (requiredRole && !this.checkRole(requiredRole)) {
      alert('您没有权限访问此页面');
      window.location.href = redirectUrl;
      return false;
    }

    // 如果未登录，重定向到首页
    if (!this.checkAuth()) {
      // 检查当前页面是否是登录页
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath.includes('login.html') || currentPath.includes('register.html');

      if (!isLoginPage) {
        alert('请先登录');
        // 根据推荐角色跳转到相应的登录页
        window.location.href = this.userRole === 'teacher' ? 'teacher-login.html' : 'parent-login.html';
        return false;
      }
    }

    return true;
  }
}

// 创建全局实例
window.authUtils = new AuthUtils();