"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./stepflow.module.css";

const formatClickSource = (
  utmSource: string,
  materialId: string | null,
  blogId: string | null = null,
  cafeId: string | null = null,
): string => {
  const sourceMap: { [key: string]: string } = {
    daangn: "당근",
    insta: "인스타",
    facebook: "페이스북",
    google: "구글",
    youtube: "유튜브",
    kakao: "카카오",
    naver: "네이버",
    naverblog: "네이버블로그",
    toss: "토스",
    mamcafe: "맘카페",
  };

  const shortSource = sourceMap[utmSource] || utmSource;
  const homepageName = "바로폼";

  if (blogId) {
    return `${homepageName}_${shortSource}_${blogId}`;
  }
  if (cafeId) {
    return `${homepageName}_${shortSource}_${cafeId}`;
  }
  if (materialId) {
    return `${homepageName}_${shortSource}_소재_${materialId}`;
  }
  return `${homepageName}_${shortSource}`;
};

// URL 파라미터를 읽는 컴포넌트
function ClickSourceHandler({
  onSourceChange,
}: {
  onSourceChange: (source: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get("utm_source");
    const materialId = searchParams.get("material_id");
    const blogId = searchParams.get("blog_id");
    const cafeId = searchParams.get("cafe_id");

    if (utmSource) {
      const formatted = formatClickSource(
        utmSource,
        materialId,
        blogId,
        cafeId,
      );
      onSourceChange(formatted);
    }
  }, [searchParams, onSourceChange]);

  return null;
}

const COURSE_OPTIONS = [
  "사회복지사",
  "아동학사",
  "평생교육사",
  "편입/대학원",
  "건강가정사",
  "청소년지도사",
  "보육교사",
  "심리상담사",
];

function StepFlowContent({ clickSource }: { clickSource: string }) {
  const [step, setStep] = useState(1);
  const [formTab, setFormTab] = useState<"consultation" | "practice">(
    "consultation",
  );
  const [formData, setFormData] = useState({
    name: "", // 성함
    contact: "", // 연락처
    type: "consultation" as "consultation" | "practice", // 상담신청/실습신청서
    // 상담신청 필드
    progress: "", // 진행과정
    employment_consulting: false, // 취업컨설팅
    employment_connection: false, // 취업연계
    student_status: "상담대기", // 학생상태
    // 실습신청서 필드
    practice_place: "", // 실습처 배정
    employment_after_cert: "", // 자격증 취득 후 취업여부
    // 레거시 필드 (하위호환성)
    education: "", // 최종학력
    hope_course: "", // 희망과정
    reason: "", // 취득사유
  });
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [customCourse, setCustomCourse] = useState("");

  const toggleCourse = (course: string) => {
    setSelectedCourses((prev) =>
      prev.includes(course)
        ? prev.filter((c) => c !== course)
        : [...prev, course],
    );
  };

  const confirmCourseSelection = () => {
    const all = [...selectedCourses];
    if (customCourse.trim()) {
      all.push(customCourse.trim());
    }
    setFormData({ ...formData, hope_course: all.join(", ") });
    setShowCourseModal(false);
  };

  // 연락처 포맷팅 (010-XXXX-XXXX)
  const formatContact = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
  };

  // 연락처 검증
  const validateContact = (contact: string) => {
    const cleaned = contact.replace(/[-\s]/g, "");
    if (cleaned.length === 0) {
      setContactError("");
      return true;
    }
    if (!cleaned.startsWith("010") && !cleaned.startsWith("011")) {
      setContactError("010 또는 011로 시작하는 번호를 입력해주세요");
      return false;
    }
    setContactError("");
    return true;
  };

  // 데이터 저장 로직
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submitData = {
        name: formData.name,
        contact: formData.contact,
        type: formData.type,
        click_source: clickSource,
        employment_after_cert: formData.employment_after_cert,
        ...(formData.type === "consultation" && {
          progress: formData.progress,
          employment_consulting: formData.employment_consulting,
          employment_connection: formData.employment_connection,
          student_status: formData.student_status,
        }),
        ...(formData.type === "practice" && {
          practice_place: formData.practice_place,
        }),
        // 레거시 필드 (하위호환성)
        education: formData.education,
        hope_course: formData.hope_course,
        reason: formData.reason,
      };

      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "저장에 실패했습니다.");
      }

      setStep(3);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(
        error instanceof Error
          ? error.message
          : "저장에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 유효성 검사 - 성함, 연락처, 개인정보 동의는 필수
  const isFormValid =
    formData.name.length > 0 &&
    formData.contact.replace(/[-\s]/g, "").length >= 10 &&
    !contactError &&
    privacyAgreed;

  // 프로그레스 계산 (필수 필드 기준)
  const totalFields = 3;
  const filledFields = [
    formData.name.length > 0,
    formData.contact.replace(/[-\s]/g, "").length >= 10 && !contactError,
    privacyAgreed,
  ].filter(Boolean).length;
  const progress = (filledFields / totalFields) * 100;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Image
            src="/logo.png"
            alt="한평생교육"
            width={130}
            height={34}
            className={styles.logo}
          />
        </div>
      </header>
      <AnimatePresence mode="wait">
        {/* STEP 1: 빈 화면 */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={styles.stepWrapper}
          >
            {/* 하단 안내 및 다음 버튼 */}
            <div className={styles.infoSection}>
              <div className={styles.infoInner}>
                <div className={styles.step1Title}>
                  <p className={styles.step1TitleText}>무료 상담신청</p>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoTitle}>
                    <div className={styles.infoNumber}>1</div> 실습처 배정
                  </div>
                  <div className={styles.infoDesc}>
                    상담 완료 후 실습처 배정
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoTitle}>
                    <div className={styles.infoNumber}>2</div> 취업 컨설팅
                  </div>
                  <div className={styles.infoDesc}>
                    취업 컨설팅 및 취업 연계 지원
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoTitle}>
                    <div className={styles.infoNumber}>3</div> 연계 지원
                  </div>
                  <div className={styles.infoDesc}>
                    자격증 취득 후 취업 연계 지원
                  </div>
                </div>
                <div className={styles.infoSection}>
                  <div className={styles.infoInner}>
                    <div className={styles.step1Heading}>
                      <h1 className={styles.step1HeadingText}>
                        학점 연계 신청
                      </h1>
                    </div>

                    <div className={styles.infoCall}>
                      <span className={styles.step1CallText}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          className={styles.step1CallIcon}
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M16.7045 21.9824C15.2645 21.9294 11.1835 21.3654 6.90947 17.0924C2.63647 12.8184 2.07347 8.73837 2.01947 7.29737C1.93947 5.10137 3.62147 2.96837 5.56447 2.13537C5.79844 2.03433 6.05467 1.99587 6.308 2.02374C6.56133 2.05162 6.80305 2.14488 7.00947 2.29437C8.60947 3.46037 9.71346 5.22437 10.6615 6.61137C10.87 6.9161 10.9592 7.28691 10.912 7.65316C10.8648 8.01941 10.6845 8.35549 10.4055 8.59737L8.45446 10.0464C8.36021 10.1144 8.29386 10.2144 8.26774 10.3277C8.24162 10.441 8.25752 10.5599 8.31246 10.6624C8.75447 11.4654 9.54046 12.6614 10.4405 13.5614C11.3405 14.4614 12.5935 15.2994 13.4525 15.7914C13.5602 15.8518 13.6869 15.8687 13.8067 15.8386C13.9265 15.8085 14.0302 15.7336 14.0965 15.6294L15.3665 13.6964C15.6 13.3862 15.9444 13.1784 16.3276 13.1165C16.7109 13.0547 17.1032 13.1435 17.4225 13.3644C18.8295 14.3384 20.4715 15.4234 21.6735 16.9624C21.8351 17.1703 21.9379 17.4178 21.9712 17.679C22.0044 17.9402 21.9669 18.2056 21.8625 18.4474C21.0255 20.4004 18.9075 22.0634 16.7045 21.9824Z"
                            fill="#0049E5"
                          />
                        </svg>
                        빠른 문의:{" "}
                        <a
                          href="tel:0221354951"
                          className={styles.infoCallLink}
                        >
                          02-2135-4951
                        </a>
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.bottomButton}
                    onClick={() => setStep(2)}
                  >
                    다음
                  </button>
                </div>
              </div>
              <button
                className={styles.bottomButton + " " + styles.infoNextBtn}
                onClick={() => setStep(2)}
              >
                다음
              </button>
            </div>
          </motion.div>
        )}
        {/* STEP 2: 기존 정보입력 폼 */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={styles.stepWrapper}
          >
            {/* 프로그레스 바 */}
            <div className={styles.progressContainer}>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={styles.progressText}>{Math.round(progress)}%</p>
            </div>

            <div className={styles.step2Title}>
              <h1 className={styles.step2TitleText}>상담신청</h1>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>이름을 입력해주세요</label>
              <input
                type="text"
                placeholder="이름을 입력해주세요"
                className={styles.inputField}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                autoFocus
              />
            </div>

            {formData.name.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>
                  연락처를 입력해주세요
                </label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  className={styles.inputField}
                  value={formData.contact}
                  onChange={(e) => {
                    const value = e.target.value;
                    const formatted = formatContact(value);
                    setFormData({ ...formData, contact: formatted });
                    validateContact(formatted);
                  }}
                />
                {contactError && (
                  <p className={styles.errorMessage}>{contactError}</p>
                )}
              </motion.div>
            )}

            {/* 자격증 취득 후 취업여부 */}
            {formData.contact.replace(/[-\s]/g, "").length >= 10 &&
              !contactError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    자격증 취득 후 취업여부
                  </label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="employment_after_cert"
                        value="O"
                        checked={formData.employment_after_cert === "O"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            employment_after_cert: e.target.value,
                          })
                        }
                        className={styles.radio}
                      />
                      <span>예</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="employment_after_cert"
                        value="X"
                        checked={formData.employment_after_cert === "X"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            employment_after_cert: e.target.value,
                          })
                        }
                        className={styles.radio}
                      />
                      <span>아니오</span>
                    </label>
                  </div>
                </motion.div>
              )}

            {/* 개인정보처리방침 동의 */}
            {formData.contact.replace(/[-\s]/g, "").length >= 10 &&
              !contactError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={privacyAgreed}
                      onChange={(e) => setPrivacyAgreed(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowPrivacyModal(true);
                        }}
                        className={styles.privacyLink}
                      >
                        개인정보처리방침
                      </button>{" "}
                      동의
                    </span>
                  </label>
                </motion.div>
              )}

            <button
              className={styles.bottomButton}
              disabled={!isFormValid || loading}
              onClick={handleSubmit}
            >
              {loading ? "처리 중..." : "제출하기"}
            </button>
          </motion.div>
        )}
        {/* STEP 3: 완료 화면 */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${styles.stepWrapper} ${styles.step3Container}`}
          >
            <Image
              src="/complete-check.png"
              alt="Done"
              width={300}
              height={300}
              priority
              className={styles.step3Image}
            />
            <h1 className={styles.title}>
              신청이 완료되었습니다.{"\n"}곧 연락드리겠습니다.
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 개인정보처리방침 모달 */}
      {showPrivacyModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className={styles.modalPrivacy}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalPrivacyHeader}>
              <h3 className={styles.modalPrivacyTitle}>개인정보처리방침</h3>
              <button
                className={styles.modalCloseButton}
                onClick={() => setShowPrivacyModal(false)}
                aria-label="닫기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className={styles.modalPrivacyContent}>
              <div className={styles.modalPrivacyScroll}>
                <p className={styles.modalPrivacyItem}>
                  <strong>1. 개인정보 수집 및 이용 목적</strong>
                  <br />
                  사회복지사 자격 취득 상담 진행, 문의사항 응대
                  <br />
                  개인정보는 상담 서비스 제공을 위한 목적으로만 수집 및
                  이용되며, 동의 없이 제3자에게 제공되지 않습니다
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>2. 수집 및 이용하는 개인정보 항목</strong>
                  <br />
                  필수 - 이름, 연락처, 자격증 취득 후 취업여부
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>3. 보유 및 이용 기간</strong>
                  <br />
                  법령이 정하는 경우를 제외하고는 수집일로부터 1년 또는 동의
                  철회 시까지 보유 및 이용합니다.
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>4. 동의 거부 권리</strong>
                  <br />
                  신청자는 동의를 거부할 권리가 있습니다. 단, 동의를 거부하는
                  경우 상담 서비스 이용이 제한됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 희망과정 선택 모달 */}
      {showCourseModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowCourseModal(false)}
        >
          <div
            className={styles.modalPrivacy}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalPrivacyHeader}>
              <h3 className={styles.modalPrivacyTitle}>희망과정 선택</h3>
              <button
                className={styles.modalCloseButton}
                onClick={() => setShowCourseModal(false)}
                aria-label="닫기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className={styles.courseModalContent}>
              <p className={styles.courseModalDesc}>복수 선택이 가능합니다</p>
              <div className={styles.courseList}>
                {COURSE_OPTIONS.map((course) => (
                  <button
                    key={course}
                    className={`${styles.courseItem} ${selectedCourses.includes(course) ? styles.courseItemSelected : ""}`}
                    onClick={() => toggleCourse(course)}
                  >
                    <span>{course}</span>
                    {selectedCourses.includes(course) && (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 10L8 14L16 6"
                          stroke="#4C85FF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className={styles.customCourseWrapper}>
                <label className={styles.customCourseLabel}>직접 입력</label>
                <input
                  type="text"
                  className={styles.customCourseInput}
                  placeholder="원하는 과정을 직접 입력해주세요"
                  value={customCourse}
                  onChange={(e) => setCustomCourse(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.courseModalFooter}>
              <button
                className={styles.courseConfirmButton}
                disabled={selectedCourses.length === 0 && !customCourse.trim()}
                onClick={confirmCourseSelection}
              >
                {selectedCourses.length > 0 || customCourse.trim()
                  ? "선택 완료"
                  : "과정을 선택해주세요"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepFlowPage() {
  const [clickSource, setClickSource] = useState<string>("바로폼");

  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600">로딩 중...</p>
            </div>
          </div>
        </div>
      }
    >
      <ClickSourceHandler onSourceChange={setClickSource} />
      <StepFlowContent clickSource={clickSource} />
    </Suspense>
  );
}
