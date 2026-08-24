// 认证工具函数
class AuthUtils {
  constructor() {
    this.isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    this.userRole = localStorage.getItem('userRole');
    this.userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;
  }

  // 检查是否已登录
  checkAuth() {
    return Boolean(localStorage.getItem('supabaseAccessToken') || localStorage.getItem('isAuthenticated') === 'true')
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
    ['isAuthenticated', 'userRole', 'userInfo', 'supabaseAccessToken', 'supabaseRefreshToken', 'token', 'devBypass'].forEach(key => localStorage.removeItem(key));
    this.isAuthenticated = false;
    this.userRole = null;
    this.userInfo = null;
  }

  getAccessToken() {
    return localStorage.getItem('supabaseAccessToken');
  }

  authHeaders(headers = {}) {
    const token = this.getAccessToken();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  }

  async apiFetch(url, options = {}) {
    const requestOptions = { ...options, headers: this.authHeaders({ ...(options.headers || {}) }) };
    let response = await fetch(url, requestOptions);
    if (response.status !== 401) return response;

    const refreshToken = localStorage.getItem('supabaseRefreshToken');
    if (!refreshToken) { this.clearAuth(); window.location.href = 'parent-login.html'; return response; }
    try {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!refreshResponse.ok) throw new Error('refresh failed');
      const data = await refreshResponse.json();
      localStorage.setItem('supabaseAccessToken', data.access_token);
      if (data.refresh_token) localStorage.setItem('supabaseRefreshToken', data.refresh_token);
      response = await fetch(url, { ...requestOptions, headers: this.authHeaders({ ...(options.headers || {}) }) });
      if (response.status === 401) throw new Error('session expired');
      return response;
    } catch {
      this.clearAuth();
      window.location.href = this.userRole === 'teacher' ? 'teacher-login.html' : 'parent-login.html';
      return response;
    }
  }

  async verifySession() {
    const token = this.getAccessToken();
    if (!token) return false;
    try {
      const response = await this.apiFetch('/api/auth/me');
      if (!response.ok) { this.clearAuth(); return false; }
      const data = await response.json();
      if (data.user) {
        localStorage.setItem('userInfo', JSON.stringify(data.user));
        localStorage.setItem('userRole', data.user.role);
      }
      return true;
    } catch { return false; }
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