/**
 * 数据库存储层 - 支持内存存储和 Cloudflare KV
 * EdgeOne Pages 环境下的数据持久化方案
 */

// KV 命名空间绑定（在 wrangler.jsonc 中配置）
// const KV = process.env.ESSAY_KV;

class DataStore {
  constructor() {
    this.users = [];
    this.classes = [];
    this.assignments = [];
    this.essays = [];
    this.gradings = [];
    this.idCounters = {
      user: 100,
      class: 100,
      assignment: 100,
      essay: 100,
      grading: 100
    };
  }

  // 生成新 ID
  generateId(type) {
    return this.idCounters[type]++;
  }

  // 用户操作
  findUser(username) {
    return this.users.find(u => u.username === username);
  }

  findUserById(id) {
    return this.users.find(u => u.id === id);
  }

  createUser(userData) {
    const user = {
      id: this.generateId('user'),
      ...userData,
      created_at: new Date().toISOString()
    };
    this.users.push(user);
    return user;
  }

  // 班级操作
  findClass(id) {
    return this.classes.find(c => c.id === id);
  }

  getClasses() {
    return this.classes;
  }

  createClass(classData) {
    const cls = {
      id: this.generateId('class'),
      ...classData,
      created_at: new Date().toISOString()
    };
    this.classes.push(cls);
    return cls;
  }

  // 作业操作
  findAssignment(id) {
    return this.assignments.find(a => a.id === id);
  }

  getAssignments(filters = {}) {
    let result = [...this.assignments];
    if (filters.classId) {
      result = result.filter(a => a.class_id === parseInt(filters.classId));
    }
    if (filters.status) {
      result = result.filter(a => a.status === filters.status);
    }
    return result;
  }

  createAssignment(assignmentData) {
    const assignment = {
      id: this.generateId('assignment'),
      ...assignmentData,
      status: 'active',
      created_at: new Date().toISOString()
    };
    this.assignments.push(assignment);
    return assignment;
  }

  updateAssignment(id, updates) {
    const idx = this.assignments.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.assignments[idx] = { ...this.assignments[idx], ...updates };
      return this.assignments[idx];
    }
    return null;
  }

  deleteAssignment(id) {
    const idx = this.assignments.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.assignments.splice(idx, 1);
      return true;
    }
    return false;
  }

  // 作文操作
  findEssay(id) {
    return this.essays.find(e => e.id === id);
  }

  getEssays(filters = {}) {
    let result = [...this.essays];
    if (filters.studentId) {
      result = result.filter(e => e.user_id === parseInt(filters.studentId));
    }
    if (filters.assignmentId) {
      result = result.filter(e => e.assignment_id === parseInt(filters.assignmentId));
    }
    if (filters.status) {
      result = result.filter(e => e.status === filters.status);
    }
    if (filters.grade) {
      result = result.filter(e => e.grade === filters.grade);
    }
    return result;
  }

  createEssay(essayData) {
    const essay = {
      id: this.generateId('essay'),
      ...essayData,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    this.essays.push(essay);
    return essay;
  }

  updateEssay(id, updates) {
    const idx = this.essays.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.essays[idx] = { ...this.essays[idx], ...updates };
      return this.essays[idx];
    }
    return null;
  }

  // 批改操作
  findGrading(essayId) {
    return this.gradings.find(g => g.essay_id === essayId);
  }

  getGradings(filters = {}) {
    let result = [...this.gradings];
    if (filters.essayId) {
      result = result.filter(g => g.essay_id === parseInt(filters.essayId));
    }
    if (filters.teacherId) {
      result = result.filter(g => g.teacher_id === parseInt(filters.teacherId));
    }
    return result;
  }

  createGrading(gradingData) {
    const grading = {
      id: this.generateId('grading'),
      ...gradingData,
      grading_status: 'submitted',
      created_at: new Date().toISOString()
    };
    this.gradings.push(grading);
    return grading;
  }

  updateGrading(id, updates) {
    const idx = this.gradings.findIndex(g => g.id === id);
    if (idx !== -1) {
      this.gradings[idx] = { ...this.gradings[idx], ...updates };
      return this.gradings[idx];
    }
    return null;
  }
}

// 全局单例
const db = new DataStore();

// 初始化示例数据
function initSampleData() {
  if (db.users.length === 0) {
    // 示例教师
    db.createUser({
      username: 'teacher001',
      password: '123456',
      role: 'teacher',
      realName: '李老师',
      subject: '语文',
      school: '第一小学'
    });

    // 示例家长
    db.createUser({
      username: 'parent001',
      password: '123456',
      role: 'parent',
      realName: '张家长',
      grade: '三年级',
      className: '3班'
    });

    // 示例班级
    db.createClass({
      name: '三年级1班',
      teacher_id: 100,
      description: '三年级语文班'
    });

    // 示例作业
    db.createAssignment({
      title: '春天的发现',
      type: '写景',
      class_id: 100,
      min_words: 200,
      max_words: 400,
      points: 100,
      deadline: '2024-06-01 18:00'
    });

    console.log('示例数据初始化完成');
  }
}

// 启动时初始化
initSampleData();

module.exports = db;
