# 错题管理系统 - 领域词汇表 (Domain Glossary)

本文档定义系统核心业务域的统一语言 (Ubiquitous Language)，仅包含领域概念与业务规则，严禁引入具体技术实现细节。

## 1. 错题域 (Error Question Domain)

- **错题 (Error Question)**：学生在日常学习或考试中做错的学科题目，包含科目、题型、题干、标准答案及解析。
- **单题录入 (Single Question Entry)**：学生手动填写或单张图片识别录入独立一道错题的动作。
- **整页/多题选择导入 (Multi-Question Batch Import)**：学生上传包含多道错题的整页试卷/作业照片，由系统识别定位多道题目区域，经学生确认/微调后批量创建错题的过程。
- **题目识别区域/框 (Question Bounding Region)**：整页照片中独立题目所占用的几何二维区域空间。
- **查重指纹 (Question Fingerprint)**：基于规范化文本提取的题目特征标识，用于判断错题是否重复。

## 2. 掌握与学习域 (Mastery & Learning Domain)

- **掌握记录 (Mastery Record)**：记录学生对某道错题的复习打卡状态、连续做对次数与艾宾浩斯复习间隔。
- **待复习错题 (Pending Question)**：未达到完全掌握标准且复习时间已到的错题。
- **已掌握错题 (Mastered Question)**：连续 3 次打卡做对并达到最长复习间隔的错题。

## 3. 统计与监控域 (Report & Admin Domain)

- **LLM 场景 (LLM Scene)**：大模型调用的业务分类，如错题识别 (`recognition`)、智能判题 (`grading`)、相似题推荐 (`similar`)。
- **用量告警 (Usage Alert)**：当大模型 Token 消耗超过预算阈值时向管理员发出的通知。

## 4. 多题识别 UI 语境 (Multi-Question UI Context)

- **识别卡片 (Recognition Card)**：识别结果列表中承载单道题目缩略图、文字解析、科目下拉与查重标记的独立 UI 单元。
- **弹窗精细裁剪 (Modal Crop Preview)**：在移动端弹出的支持双指缩放与自由调整识别框的手势交互界面。
- **多题识别场景 (`multi_recognition`)**：大模型监控中专门用于整页多题切分与识别的 Token 统计场景。
