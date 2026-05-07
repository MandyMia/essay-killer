// Word导出工具类
class WordExporter {
  constructor() {
    this.docx = null;
    try {
      // 尝试引入docx库
      this.docx = require('docx');
    } catch (e) {
      console.warn('docx库未找到，将使用导出为网页的方式');
    }
  }

  /**
   * 导出作文批改结果为Word文档
   * @param {Object} essayData - 作文数据
   * @returns {Promise<Blob>} - Word文档Blob对象
   */
  async exportEssayToWord(essayData) {
    try {
      if (this.docx) {
        return await this.exportWithDocx(essayData);
      } else {
        return this.exportAsHTML(essayData);
      }
    } catch (error) {
      console.error('导出Word失败:', error);
      throw error;
    }
  }

  /**
   * 使用docx库导出
   */
  async exportWithDocx(essayData) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = this.docx;

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 标题
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: essayData.title || '作文批改报告',
                bold: true,
                size: 32,
              }),
            ],
          }),

          // 基本信息
          new Paragraph({
            children: [
              new TextRun({
                text: `\n学生：${essayData.studentName || ''}  班级：${essayData.className || ''}\n`,
                size: 24,
              }),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `提交时间：${essayData.submitTime || ''}  批改时间：${essayData.gradingTime || ''}\n\n`,
                size: 24,
              }),
            ],
          }),

          // 原文内容
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '原文内容',
                bold: true,
                size: 28,
              }),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: essayData.originalText || '',
                size: 24,
              }),
            ],
          }),

          // AI批改结果
          if (essayData.aiCorrection) {
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [
                new TextRun({
                  text: 'AI智能批改',
                  bold: true,
                  size: 28,
                }),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: essayData.aiCorrection,
                  size: 24,
                }),
              ],
            }),
          }

          // 高分范文
          if (essayData.highScoreEssay) {
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [
                new TextRun({
                  text: '考场高分范文',
                  bold: true,
                  size: 28,
                }),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: essayData.highScoreEssay,
                  size: 24,
                }),
              ],
            }),
          }

          // 教师评语
          if (essayData.teacherComments) {
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [
                new TextRun({
                  text: '教师评语',
                  bold: true,
                  size: 28,
                }),
              ],
            }),

            if (essayData.teacherComments.positive) {
              new Paragraph({
                children: [
                  new TextRun({
                    text: '优点：\n',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: essayData.teacherComments.positive,
                    size: 24,
                  }),
                ],
              });
            }

            if (essayData.teacherComments.suggestions) {
              new Paragraph({
                children: [
                  new TextRun({
                    text: '\n建议：\n',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: essayData.teacherComments.suggestions,
                    size: 24,
                  }),
                ],
              });
            }

            if (essayData.teacherComments.overall) {
              new Paragraph({
                children: [
                  new TextRun({
                    text: '\n总体评价：\n',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: essayData.teacherComments.overall,
                    size: 24,
                  }),
                ],
              });
            }
          }

          // 得分
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '评分结果',
                bold: true,
                size: 28,
              }),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `\n总分：${essayData.score || 0}分\n`,
                bold: true,
                size: 32,
              }),
            ],
          }),
        ],
      }],
    });

    // 生成文档
    const buffer = await Packer.toBuffer(doc);
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  /**
   * 导出为HTML格式（作为Word的替代）
   */
  exportAsHTML(essayData) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${essayData.title || '作文批改报告'}</title>
        <style>
          body { font-family: '宋体', serif; line-height: 1.8; margin: 40px; }
          h1 { text-align: center; font-size: 24pt; margin-bottom: 30px; }
          h2 { font-size: 18pt; margin-top: 30px; margin-bottom: 15px; }
          h3 { font-size: 16pt; margin-top: 20px; margin-bottom: 10px; }
          p { font-size: 14pt; margin-bottom: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { font-size: 12pt; margin-bottom: 20px; }
          .score { text-align: center; font-size: 24pt; font-weight: bold; margin: 30px 0; }
        </style>
      </head>
      <body>
        <h1>${essayData.title || '作文批改报告'}</h1>

        <div class="header">
          <p class="info">
            学生：${essayData.studentName || ''} &nbsp;&nbsp;
            班级：${essayData.className || ''}<br>
            提交时间：${essayData.submitTime || ''} &nbsp;&nbsp;
            批改时间：${essayData.gradingTime || ''}
          </p>
        </div>

        <h2>原文内容</h2>
        <p>${essayData.originalText || ''}</p>

        ${essayData.aiCorrection ? `
          <h2>AI智能批改</h2>
          <p>${essayData.aiCorrection}</p>
        ` : ''}

        ${essayData.highScoreEssay ? `
          <h2>考场高分范文</h2>
          <p>${essayData.highScoreEssay}</p>
        ` : ''}

        ${essayData.teacherComments ? `
          <h2>教师评语</h2>
          ${essayData.teacherComments.positive ? `
            <h3>优点</h3>
            <p>${essayData.teacherComments.positive}</p>
          ` : ''}

          ${essayData.teacherComments.suggestions ? `
            <h3>建议</h3>
            <p>${essayData.teacherComments.suggestions}</p>
          ` : ''}

          ${essayData.teacherComments.overall ? `
            <h3>总体评价</h3>
            <p>${essayData.teacherComments.overall}</p>
          ` : ''}
        ` : ''}

        <div class="score">
          总分：${essayData.score || 0}分
        </div>
      </body>
      </html>
    `;

    return new Blob([htmlContent], { type: 'text/html' });
  }

  /**
   * 下载文件
   * @param {Blob} blob - 文件Blob
   * @param {string} filename - 文件名
   */
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || '作文批改报告.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 导出作文详情页
   */
  exportEssayDetail() {
    const essayData = {
      title: document.querySelector('h2').textContent || '春天来了',
      studentName: '小明',
      className: '三年级1班',
      submitTime: document.querySelector('.bi-clock').parentNode.textContent.trim(),
      gradingTime: new Date().toLocaleString('zh-CN'),
      originalText: document.querySelector('.original-text p')?.textContent || '',
      aiCorrection: this.extractAICorrection(),
      highScoreEssay: document.querySelector('.high-score-text p')?.textContent || '',
      teacherComments: this.extractTeacherComments(),
      score: document.querySelector('.score')?.textContent || '85分'
    };

    this.exportEssayToWord(essayData).then(blob => {
      this.downloadFile(blob, `${essayData.title}_批改报告.docx`);
    });
  }

  /**
   * 提取AI批改内容
   */
  extractAICorrection() {
    let correction = '';
    const alert = document.querySelector('.alert.alert-info');
    if (alert) {
      correction = alert.textContent;
    }

    // 添加问题详解
    const accordionItems = document.querySelectorAll('#problemAccordion .accordion-body');
    accordionItems.forEach(item => {
      correction += '\n\n' + item.textContent;
    });

    return correction;
  }

  /**
   * 提取教师评语
   */
  extractTeacherComments() {
    return {
      positive: document.getElementById('positiveComments')?.value || '',
      suggestions: document.getElementById('suggestions')?.value || '',
      overall: document.getElementById('overallComments')?.value || ''
    };
  }
}

// 导出工具实例
window.wordExporter = new WordExporter();

// 全局导出函数
function exportEssayWord() {
  window.wordExporter.exportEssayDetail();
}