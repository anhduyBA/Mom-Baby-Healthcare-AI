export const evaluateLifestyleRules = (data) => {
  const studyHours = Number(data.studyHours ?? data.Study_Hours_Per_Day ?? 0);
  const extracurricularHours = Number(data.extracurricularHours ?? data.Extracurricular_Hours_Per_Day ?? 0);
  const sleepHours = Number(data.sleepHours ?? data.Sleep_Hours_Per_Day ?? 0);
  const socialHours = Number(data.socialHours ?? data.Social_Hours_Per_Day ?? 0);
  const physicalActivityHours = Number(data.physicalActivityHours ?? data.Physical_Activity_Hours_Per_Day ?? 0);
  const gpa = Number(data.gpa ?? data.GPA ?? 0);
  const stressLevel = data.stressLevel ?? data.Stress_Level ?? "Low";

  const alerts = [];
  const now = new Date();

  // BR01 - Sleep Warning (HIGH)
  if (sleepHours < 6) {
    alerts.push({
      ruleId: "BR01",
      severity: "HIGH",
      title: "Thiếu ngủ nghiêm trọng",
      message: "Bạn ngủ ít hơn 6 tiếng mỗi ngày, ảnh hưởng tiêu cực đến trí nhớ, khả năng tập trung và sức khỏe lâu dài.",
      suggestion: "Hãy sắp xếp thời gian đi ngủ sớm hơn và đảm bảo ngủ đủ giấc (7-9 tiếng mỗi đêm). Hạn chế dùng điện thoại trước khi ngủ.",
      triggeredAt: now
    });
  }

  // BR02 - High Stress + Overwork (HIGH)
  if (stressLevel === "High" && studyHours > 8) {
    alerts.push({
      ruleId: "BR02",
      severity: "HIGH",
      title: "Cân bằng học tập và nghỉ ngơi",
      message: "Mức độ căng thẳng cao đi kèm với thời gian học tập quá 8 tiếng mỗi ngày có thể dẫn đến quá tải và suy nhược.",
      suggestion: "Áp dụng phương pháp Pomodoro (học 25 phút, nghỉ 5 phút) và dành thời gian nghỉ ngơi thư giãn. Giảm bớt khối lượng tự học nếu cần.",
      triggeredAt: now
    });
  }

  // BR03 - Low Physical Activity (MEDIUM)
  if (physicalActivityHours < 1) {
    alerts.push({
      ruleId: "BR03",
      severity: "MEDIUM",
      title: "Tăng vận động nhẹ",
      message: "Thời gian vận động thể chất của bạn dưới 1 tiếng mỗi ngày, có thể làm giảm mức năng lượng và sức bền thể lực.",
      suggestion: "Bắt đầu bằng việc đi bộ nhẹ nhàng 15-30 phút mỗi ngày, tập các bài giãn cơ tại chỗ giữa các giờ học.",
      triggeredAt: now
    });
  }

  // BR04 - Low GPA + Low Study (HIGH)
  if (gpa < 2.5 && studyHours < 4) {
    alerts.push({
      ruleId: "BR04",
      severity: "HIGH",
      title: "Cần tăng cường học tập",
      message: "GPA hiện tại dưới 2.5 và thời gian tự học dưới 4 tiếng mỗi ngày đang đe dọa trực tiếp đến kết quả học tập của bạn.",
      suggestion: "Tăng thời gian tự học lên tối thiểu 4 tiếng/ngày. Lập thời khóa biểu học tập chi tiết và tìm kiếm sự trợ giúp từ bạn bè hoặc giảng viên.",
      triggeredAt: now
    });
  }

  // BR05 - Excessive Social Hours (MEDIUM)
  if (socialHours > 5 && gpa < 2.8) {
    alerts.push({
      ruleId: "BR05",
      severity: "MEDIUM",
      title: "Mất cân bằng thời gian xã hội",
      message: "Bạn đang dành quá 5 tiếng mỗi ngày cho các hoạt động xã hội/giải trí trong khi kết quả học tập (GPA < 2.8) cần được cải thiện.",
      suggestion: "Cân đối lại lịch trình, rút bớt thời gian đi chơi hoặc lướt mạng xã hội để tập trung hoàn thành các bài tập và ôn thi.",
      triggeredAt: now
    });
  }

  // BR06 - Healthy Lifestyle Badge (POSITIVE)
  if (sleepHours >= 7 && sleepHours <= 9 && physicalActivityHours >= 1 && stressLevel !== "High") {
    alerts.push({
      ruleId: "BR06",
      severity: "POSITIVE",
      title: "Lối sống lành mạnh",
      message: "Chúc mừng! Bạn đang duy trì thời gian ngủ hợp lý, chăm vận động thể chất và kiểm soát căng thẳng tốt.",
      suggestion: "Hãy tiếp tục duy trì nhịp sống tích cực này để duy trì năng lượng học tập tốt nhất!",
      triggeredAt: now
    });
  }

  // BR07 - Academic Burnout Risk (HIGH)
  if (gpa >= 3.5 && stressLevel === "High" && sleepHours < 7) {
    alerts.push({
      ruleId: "BR07",
      severity: "HIGH",
      title: "Nguy cơ burnout học thuật",
      message: "GPA xuất sắc nhưng bạn đang gặp căng thẳng cao độ và ngủ dưới 7 tiếng. Bạn đang hy sinh sức khỏe cho thành tích học tập.",
      suggestion: "Sức khỏe là nền tảng bền vững. Hãy chủ động giảm bớt áp lực tự thân, ưu tiên giấc ngủ tối thiểu 7 tiếng và chia sẻ gánh nặng học tập.",
      triggeredAt: now
    });
  }

  // BR08 - No Extracurricular + High Stress (MEDIUM)
  if (extracurricularHours < 0.5 && stressLevel === "High") {
    alerts.push({
      ruleId: "BR08",
      severity: "MEDIUM",
      title: "Tham gia hoạt động ngoại khóa",
      message: "Bạn ít tham gia hoạt động ngoại khóa (dưới 30 phút/ngày) và đang chịu căng thẳng cao.",
      suggestion: "Tham gia các câu lạc bộ, hoạt động tình nguyện hoặc giao lưu nhóm giúp giảm bớt căng thẳng học tập và cải thiện tâm trạng.",
      triggeredAt: now
    });
  }

  // BR09 - Study Hard but Low GPA (MEDIUM)
  if (studyHours > 7 && gpa < 2.8) {
    alerts.push({
      ruleId: "BR09",
      severity: "MEDIUM",
      title: "Học nhiều nhưng chưa hiệu quả",
      message: "Thời gian học trên 7 tiếng/ngày nhưng điểm số GPA vẫn dưới 2.8 cho thấy phương pháp học hiện tại có thể chưa phù hợp.",
      suggestion: "Xem xét lại phương pháp học tập. Thử các kỹ năng ghi nhớ tích cực, làm việc nhóm hoặc tham gia các buổi hướng dẫn học tập.",
      triggeredAt: now
    });
  }

  // BR10 - Oversleeping (MEDIUM)
  if (sleepHours > 10 && stressLevel !== "Low") {
    alerts.push({
      ruleId: "BR10",
      severity: "MEDIUM",
      title: "Theo dõi chất lượng giấc ngủ",
      message: "Ngủ hơn 10 tiếng mỗi ngày kèm theo mức độ stress từ trung bình trở lên có thể là biểu hiện của mệt mỏi tinh thần hoặc giấc ngủ kém chất lượng.",
      suggestion: "Cố gắng ngủ đúng giờ, thiết lập lịch thức dậy cố định và kiểm tra xem giấc ngủ của bạn có bị gián đoạn hay không.",
      triggeredAt: now
    });
  }

  // BR11 - Social Isolation Risk (HIGH)
  if (socialHours < 0.5 && studyHours > 8) {
    alerts.push({
      ruleId: "BR11",
      severity: "HIGH",
      title: "Nguy cơ cô lập xã hội",
      message: "Bạn học trên 8 tiếng nhưng thời gian giao tiếp xã hội dưới 30 phút mỗi ngày, tăng nguy cơ cô lập và ảnh hưởng sức khỏe tâm thần.",
      suggestion: "Dành ít nhất 30 phút để trò chuyện với bạn bè, gia đình hoặc tham gia học nhóm để giải tỏa tâm lý.",
      triggeredAt: now
    });
  }

  // BR12 - Perfect Balance (POSITIVE / IDEAL)
  if (studyHours >= 5 && studyHours <= 8 && 
      sleepHours >= 7 && sleepHours <= 9 && 
      physicalActivityHours >= 1 && 
      socialHours >= 1 && socialHours <= 3 && 
      gpa >= 3.0) {
    alerts.push({
      ruleId: "BR12",
      severity: "POSITIVE",
      title: "Trạng thái lý tưởng",
      message: "Chúc mừng! Bạn đạt được sự cân bằng tuyệt vời giữa học tập, nghỉ ngơi, vận động thể chất, kết nối xã hội và kết quả học tập xuất sắc.",
      suggestion: "Báo cáo tổng kết tuần này sẽ ghi nhận nỗ lực xuất sắc của bạn. Hãy tiếp tục phong độ tuyệt vời này nhé!",
      triggeredAt: now
    });
  }

  return alerts;
};
