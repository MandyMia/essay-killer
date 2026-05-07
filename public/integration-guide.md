# 多图上传组件集成指南

## 概述

多图上传组件是一个用于批量上传手写作文图片并进行OCR识别的模块。支持最多9张图片上传，具有拖拽功能、实时预览、单独删除等功能。

## 功能特性

1. **多图上传**：支持一次选择最多9张图片
2. **拖拽上传**：支持拖拽文件到上传区域
3. **实时预览**：网格布局展示已选图片
4. **单独删除**：每张图片都有独立的删除按钮
5. **文件验证**：
   - 图片格式：JPG、PNG
   - 单张大小：最大5MB
6. **OCR识别**：上传后可进行文字识别
7. **数据显示**：实时显示已选数量/最大数量

## 快速集成

### 1. HTML结构

```html
<div class="image-upload-section">
  <div class="info-bar">
    <span class="info-text">
      <i class="bi bi-info-circle me-2"></i>
      支持JPG、PNG格式，单次最多9张图片
    </span>
    <span class="image-count">
      <span id="selected-count">0</span> / 9
    </span>
  </div>

  <div class="upload-container">
    <div class="upload-area" onclick="document.getElementById('file-input').click()">
      <i class="bi bi-cloud-upload upload-icon"></i>
      <div class="upload-text">点击或拖拽图片到这里</div>
      <div class="upload-hint">支持多选，按住 Ctrl 键可选择多个文件</div>
      <input type="file" id="file-input" multiple accept="image/jpeg,image/jpg,image/png">
    </div>

    <!-- 图片预览区域 -->
    <div id="preview-section" style="display: none;">
      <h5 class="mb-3">
        <i class="bi bi-images me-2"></i>已选择的图片
      </h5>
      <div id="preview-grid" class="preview-grid">
        <!-- 图片预览项将在这里动态生成 -->
      </div>
    </div>

    <!-- 空状态 -->
    <div id="empty-state" class="empty-state">
      <i class="bi bi-image"></i>
      <p>还没有选择任何图片</p>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons" id="action-buttons" style="display: none;">
      <button class="btn btn-outline-primary" onclick="clearAllImages()">
        <i class="bi bi-x-circle me-2"></i>清空重选
      </button>
      <button class="btn btn-primary" onclick="performOCR()">
        <i class="bi bi-magic me-2"></i>识别文字
      </button>
    </div>
  </div>
</div>

<!-- OCR识别结果 -->
<div id="ocr-result-section" style="display: none;">
  <h5>
    <i class="bi bi-magic me-2 text-primary"></i>OCR识别结果
  </h5>
  <div class="ocr-result">
    <p class="mb-0" id="ocr-result-text"></p>
  </div>
  <div class="mt-2">
    <button class="btn btn-sm btn-outline-primary" onclick="useOCRResult()">
      <i class="bi bi-check-circle me-1"></i>使用识别结果
    </button>
  </div>
</div>
```

### 2. CSS样式

将以下CSS添加到您的样式文件中：

```css
.image-upload-section {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  margin: 20px 0;
}

.upload-container {
  background: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.upload-area {
  border: 3px dashed #667eea;
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  background: #f8f9ff;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.upload-area:hover {
  border-color: #5a67d8;
  background: #f0f4ff;
  transform: translateY(-2px);
}

.upload-area.dragover {
  border-color: #4c51bf;
  background: #e6f3ff;
}

.upload-icon {
  font-size: 3rem;
  color: #667eea;
  margin-bottom: 15px;
}

.upload-text {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 5px;
}

.upload-hint {
  font-size: 0.85rem;
  color: #999;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.preview-item {
  position: relative;
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.preview-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.15);
}

.preview-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}

.preview-info {
  padding: 8px;
  font-size: 0.8rem;
  color: #666;
  text-align: center;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.preview-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #dc3545;
  transform: scale(1.1);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.3;
}

.info-bar {
  background: #e7f3ff;
  border-radius: 10px;
  padding: 12px 20px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-text {
  color: #0066cc;
  font-weight: 500;
}

.image-count {
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-weight: 600;
  font-size: 0.9rem;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  padding: 12px 30px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-outline-primary {
  border: 2px solid #667eea;
  color: #667eea;
  border-radius: 10px;
  padding: 12px 30px;
  font-weight: 600;
}

.btn-outline-primary:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
}

.ocr-result {
  background: #f0f9ff;
  border-left: 4px solid #0ea5e9;
  padding: 15px;
  border-radius: 8px;
}
```

### 3. JavaScript功能

```javascript
// 全局变量
let selectedImages = [];
const MAX_IMAGES = 9;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
let ocrResultText = '';

// DOM 元素
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const previewSection = document.getElementById('preview-section');
const previewGrid = document.getElementById('preview-grid');
const emptyState = document.getElementById('empty-state');
const selectedCount = document.getElementById('selected-count');
const actionButtons = document.getElementById('action-buttons');
const ocrResultSection = document.getElementById('ocr-result-section');
const ocrResultTextDiv = document.getElementById('ocr-result-text');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  setupDragAndDrop();
  fileInput.addEventListener('change', handleFileSelect);
});

// 设置拖拽功能
function setupDragAndDrop() {
  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(Array.from(e.dataTransfer.files));
  });
}

// 处理文件选择
function handleFileSelect(e) {
  handleFiles(Array.from(e.target.files));
}

// 处理文件
function handleFiles(files) {
  // 过滤出图片文件
  const imageFiles = files.filter(file => ALLOWED_TYPES.includes(file.type));

  if (imageFiles.length === 0) {
    showError('请选择有效的图片文件（JPG、PNG格式）');
    return;
  }

  // 检查文件大小
  const oversizedFiles = imageFiles.filter(file => file.size > MAX_FILE_SIZE);
  if (oversizedFiles.length > 0) {
    showError('有图片文件超过5MB大小限制');
    return;
  }

  // 检查数量限制
  const remainingSlots = MAX_IMAGES - selectedImages.length;
  const filesToAdd = imageFiles.slice(0, remainingSlots);

  if (imageFiles.length > remainingSlots) {
    showError(`最多只能上传 ${MAX_IMAGES} 张图片，还剩 ${remainingSlots} 个位置`);
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
    selectedImages.push(imageData);
  });

  updatePreview();
}

// 更新预览
function updatePreview() {
  selectedCount.textContent = selectedImages.length;

  if (selectedImages.length > 0) {
    emptyState.style.display = 'none';
    previewSection.style.display = 'block';
    actionButtons.style.display = 'flex';

    previewGrid.innerHTML = '';
    selectedImages.forEach(image => {
      const previewItem = createPreviewItem(image);
      previewGrid.appendChild(previewItem);
    });
  } else {
    emptyState.style.display = 'block';
    previewSection.style.display = 'none';
    actionButtons.style.display = 'none';
    ocrResultSection.style.display = 'none';
  }
}

// 创建预览项
function createPreviewItem(image) {
  const div = document.createElement('div');
  div.className = 'preview-item';
  div.innerHTML = `
    <img src="${image.url}" alt="${image.name}" class="preview-image">
    <div class="preview-info">${formatFileSize(image.size)}</div>
    <button class="delete-btn" onclick="deleteImage('${image.id}')">
      <i class="bi bi-x"></i>
    </button>
  `;
  return div;
}

// 删除图片
function deleteImage(imageId) {
  const index = selectedImages.findIndex(img => img.id == imageId);
  if (index > -1) {
    URL.revokeObjectURL(selectedImages[index].url);
    selectedImages.splice(index, 1);
    updatePreview();
  }
}

// 清空所有图片
function clearAllImages() {
  if (confirm('确定要清空所有已选的图片吗？')) {
    selectedImages.forEach(image => {
      URL.revokeObjectURL(image.url);
    });
    selectedImages = [];
    updatePreview();
    ocrResultText = '';
  }
}

// 执行OCR识别
async function performOCR() {
  if (selectedImages.length === 0) {
    showError('请先选择要识别的图片');
    return;
  }

  showLoading();

  try {
    const formData = new FormData();
    selectedImages.forEach((image, index) => {
      formData.append(`images[${index}]`, image.file);
    });

    const response = await fetch('http://localhost:3003/api/ocr/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      ocrResultText = result.extractedText;
      ocrResultTextDiv.textContent = ocrResultText;
      ocrResultSection.style.display = 'block';

      if (ocrResultText.trim()) {
        showSuccess('文字识别成功！');
      } else {
        showWarning('未能识别到文字，请确保图片清晰');
      }
    } else {
      showError(result.error || '识别失败，请重试');
    }
  } catch (error) {
    showError('网络错误，请检查服务器连接');
  } finally {
    hideLoading();
  }
}

// 使用OCR结果
function useOCRResult() {
  if (ocrResultText) {
    // 将识别结果填充到文本区域
    const textArea = document.getElementById('essay-content');
    if (textArea) {
      textArea.value = ocrResultText;
    }
    showSuccess('已使用识别结果');
  }
}

// 工具函数
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
  showToast(message, 'error');
}

function showSuccess(message) {
  showToast(message, 'success');
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed`;
  toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 250px;';
  toast.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle' : 'x-circle'} me-2"></i>
    ${message}
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```

## API接口

### OCR识别接口

```
POST /api/ocr/upload
Content-Type: multipart/form-data

参数：
- images[0]: 第一张图片文件
- images[1]: 第二张图片文件
- ...

成功响应：
{
  "success": true,
  "extractedText": "识别出的文字内容",
  "images": [
    {
      "name": "image1.jpg",
      "size": 1024000,
      "url": "图片访问URL"
    }
  ]
}
```

## 响应式设计

组件已内置响应式设计，在不同屏幕尺寸下自动调整布局：

- 大屏幕：网格布局，每行3-4张图片
- 平板：网格布局，每行2-3张图片
- 手机：网格布局，每行1-2张图片

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 注意事项

1. **文件大小限制**：单张图片不超过5MB
2. **文件格式**：仅支持JPG和PNG格式
3. **跨域问题**：如果使用file://协议访问，可能会遇到跨域问题，建议使用本地服务器测试
4. **内存管理**：大量图片可能导致内存占用高，建议及时清理不需要的图片引用
5. **OCR服务**：需要确保后端OCR服务正常运行

## 部署示例

```html
<!DOCTYPE html>
<html>
<head>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
  <!-- 引入样式 -->
</head>
<body>
  <div class="container mt-4">
    <h1>作文批改系统</h1>
    
    <!-- 引入上传组件HTML -->
    
    <div class="row mt-4">
      <div class="col-12">
        <label>作文内容</label>
        <textarea class="form-control" id="essay-content" rows="5"></textarea>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <!-- 引入JavaScript功能 -->
</body>
</html>
```