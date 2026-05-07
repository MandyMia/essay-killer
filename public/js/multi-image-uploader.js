/**
 * 多图上传组件
 * 功能：
 * 1. 支持多图选择，最多9张
 * 2. 实时预览，网格展示
 * 3. 单独删除功能
 * 4. 图片格式验证
 * 5. 文件大小限制
 * 6. 输出图片数组
 */

class MultiImageUploader {
  constructor(options = {}) {
    // 默认配置
    this.config = {
      maxImages: options.maxImages || 9,
      allowedTypes: options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png'],
      maxSize: options.maxSize || 5 * 1024 * 1024, // 5MB
      container: options.container || '#image-uploader-container',
      uploadButton: options.uploadButton || '#upload-images-btn',
      previewGrid: options.previewGrid || '#image-preview-grid',
      emptyState: options.emptyState || '#empty-state',
      countDisplay: options.countDisplay || '#selected-count',
      accept: 'image/jpeg,image/jpg,image/png',
      ...options
    };

    // 数据存储
    this.images = [];
    this.dragCounter = 0;

    // 初始化
    this.init();
  }

  init() {
    this.setupElements();
    this.bindEvents();
    this.updateUI();
  }

  setupElements() {
    this.container = document.querySelector(this.config.container);
    this.uploadArea = this.container.querySelector('.upload-area');
    this.fileInput = this.container.querySelector('#file-input');
    this.previewGrid = document.querySelector(this.config.previewGrid);
    this.emptyState = document.querySelector(this.config.emptyState);
    this.countDisplay = document.querySelector(this.config.countDisplay);
    this.uploadBtn = document.querySelector(this.config.uploadButton);
  }

  bindEvents() {
    // 文件选择
    this.fileInput.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
    });

    // 拖拽事件
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      this.handleFiles(Array.from(e.dataTransfer.files));
    });

    // 点击上传区域
    this.uploadArea.addEventListener('click', () => {
      this.fileInput.click();
    });

    // 上传按钮
    this.uploadBtn.addEventListener('click', () => {
      this.uploadImages();
    });
  }

  handleFiles(files) {
    // 过滤图片文件
    const imageFiles = files.filter(file => this.config.allowedTypes.includes(file.type));

    if (imageFiles.length === 0) {
      this.showError('请选择有效的图片文件（JPG、PNG格式）');
      return;
    }

    // 检查文件大小
    const oversizedFiles = imageFiles.filter(file => file.size > this.config.maxSize);
    if (oversizedFiles.length > 0) {
      this.showError('有图片文件超过5MB大小限制');
      return;
    }

    // 检查数量限制
    const remainingSlots = this.config.maxImages - this.images.length;
    const filesToAdd = imageFiles.slice(0, remainingSlots);

    if (imageFiles.length > remainingSlots) {
      this.showError(`最多只能上传 ${this.config.maxImages} 张图片，还剩 ${remainingSlots} 个位置`);
    }

    // 添加文件
    filesToAdd.forEach(file => {
      const imageData = {
        id: Date.now() + Math.random(),
        file: file,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file)
      };
      this.images.push(imageData);
    });

    this.updateUI();

    // 清空文件输入
    this.fileInput.value = '';
  }

  updateUI() {
    // 更新计数
    this.countDisplay.textContent = `${this.images.length} / ${this.config.maxImages}`;

    // 更新预览网格
    this.previewGrid.innerHTML = '';

    if (this.images.length > 0) {
      this.emptyState.style.display = 'none';

      this.images.forEach(image => {
        const previewItem = this.createPreviewItem(image);
        this.previewGrid.appendChild(previewItem);
      });
    } else {
      this.emptyState.style.display = 'block';
    }
  }

  createPreviewItem(image) {
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.innerHTML = `
      <img src="${image.url}" alt="${image.name}" class="preview-image">
      <div class="preview-info">${this.formatFileSize(image.size)}</div>
      <button class="delete-btn" onclick="uploader.deleteImage('${image.id}')">
        <i class="bi bi-x"></i>
      </button>
    `;
    return div;
  }

  deleteImage(imageId) {
    const index = this.images.findIndex(img => img.id == imageId);
    if (index > -1) {
      URL.revokeObjectURL(this.images[index].url);
      this.images.splice(index, 1);
      this.updateUI();
    }
  }

  clearAll() {
    if (confirm('确定要清空所有已选的图片吗？')) {
      this.images.forEach(image => {
        URL.revokeObjectURL(image.url);
      });
      this.images = [];
      this.updateUI();
    }
  }

  async uploadImages() {
    if (this.images.length === 0) {
      this.showError('请先选择要上传的图片');
      return;
    }

    // 显示加载状态
    this.uploadBtn.disabled = true;
    this.uploadBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>处理中...';

    try {
      // 准备FormData用于上传
      const formData = new FormData();
      this.images.forEach((image, index) => {
        formData.append(`images[${index}]`, image.file);
      });

      // 如果有回调函数，调用它
      if (this.config.onBeforeUpload) {
        await this.config.onBeforeUpload(this.images);
      }

      // 这里是实际的上传逻辑（注释掉，因为实际项目中需要对接API）
      /*
      const response = await fetch('http://localhost:3003/api/ocr/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      */

      // 模拟上传成功
      const outputData = {
        images: this.images.map(img => ({
          name: img.name,
          size: img.size,
          url: img.url,
          base64: await this.fileToBase64(img.file) // 可选：转换为base64
        })),
        total: this.images.length,
        timestamp: new Date().toISOString()
      };

      // 如果有成功回调
      if (this.config.onSuccess) {
        this.config.onSuccess(outputData);
      }

      // 清理资源
      this.images.forEach(image => {
        URL.revokeObjectURL(image.url);
      });
      this.images = [];
      this.updateUI();

    } catch (error) {
      console.error('上传失败:', error);
      if (this.config.onError) {
        this.config.onError(error);
      }
    } finally {
      // 恢复按钮状态
      this.uploadBtn.disabled = false;
      this.uploadBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>开始识别';
    }
  }

  // 工具函数：文件转Base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // 工具函数：格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 显示错误
  showError(message) {
    // 这里可以实现更优雅的错误提示
    alert(message);
  }

  // 获取已选图片
  getImages() {
    return this.images;
  }

  // 获取输出数据
  getOutputData() {
    return {
      images: this.images.map(img => ({
        name: img.name,
        size: img.size,
        url: img.url
      })),
      total: this.images.length
    };
  }
}

// 使用示例：
// const uploader = new MultiImageUploader({
//   container: '#image-uploader-container',
//   onBeforeUpload: (images) => { console.log('准备上传:', images); },
//   onSuccess: (data) => { console.log('上传成功:', data); },
//   onError: (error) => { console.error('上传失败:', error); }
// });