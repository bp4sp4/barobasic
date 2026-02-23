"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./stepflow.module.css";
import { privacyData } from "./privacy/privacyData";

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
  const homepageName = "취업상담신청";

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

function StepFlowContent({ clickSource }: { clickSource: string }) {
  const [step, setStep] = useState(2); // step1 숨김, step2부터 시작
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    service_practice: false,
    service_employment: false,
    practice_planned_date: "",
    employment_hope_time: "",
    employment_support_fund: "" as "" | "희망함" | "희망하지 않음",
  });
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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

  // 실습예정일 20XX-MM 형식
  const formatPracticeDate = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 6);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  };

  // 데이터 저장
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submitData = {
        name: formData.name,
        contact: formData.contact,
        service_practice: formData.service_practice,
        service_employment: formData.service_employment,
        practice_planned_date: formData.service_practice
          ? formData.practice_planned_date.replace("-", "")
          : null,
        employment_hope_time: formData.employment_hope_time,
        employment_support_fund: formData.employment_support_fund === "희망함",
        privacy_agreed: privacyAgreed,
        click_source: clickSource,
        type:
          formData.service_practice && formData.service_employment
            ? "실습+취업"
            : formData.service_practice
            ? "실습"
            : "취업",
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

  // 유효성 검사
  const isFormValid =
    formData.name.length > 0 &&
    formData.contact.replace(/[-\s]/g, "").length >= 10 &&
    !contactError &&
    (formData.service_practice || formData.service_employment) &&
    (!formData.service_practice ||
      formData.practice_planned_date.length === 7) &&
    formData.employment_hope_time.length > 0 &&
    formData.employment_support_fund !== "" &&
    privacyAgreed;

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
        {/* STEP 2: 취업 상담 신청 폼 */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={styles.stepWrapper}
          >
            <div className={styles.step2Title}>
              <h1 className={styles.step2TitleText}>상담 신청</h1>
            </div>

            {/* 이름 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>이름</label>
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

            {/* 연락처 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>연락처</label>
              <input
                type="tel"
                placeholder="연락처를 입력해주세요"
                className={styles.inputField}
                value={formData.contact}
                onChange={(e) => {
                  const formatted = formatContact(e.target.value);
                  setFormData({ ...formData, contact: formatted });
                  validateContact(formatted);
                }}
              />
              {contactError && (
                <p className={styles.errorMessage}>{contactError}</p>
              )}
            </div>

            {/* 희망 신청 서비스 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>희망 신청 서비스</label>
              <div className={styles.radioGroup}>
                <label className={styles.checkboxLabel}>
                  <span>실습</span>
                  <input
                    type="checkbox"
                    checked={formData.service_practice && !formData.service_employment}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        service_practice: true,
                        service_employment: false,
                      })
                    }
                    className={styles.checkbox}
                  />
                </label>
                <label className={styles.checkboxLabel}>
                  <span>취업</span>
                  <input
                    type="checkbox"
                    checked={formData.service_employment && !formData.service_practice}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        service_practice: false,
                        service_employment: true,
                        practice_planned_date: "",
                      })
                    }
                    className={styles.checkbox}
                  />
                </label>
                <label className={styles.checkboxLabel}>
                  <span>실습 + 취업</span>
                  <input
                    type="checkbox"
                    checked={formData.service_practice && formData.service_employment}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        service_practice: true,
                        service_employment: true,
                      })
                    }
                    className={styles.checkbox}
                  />
                </label>
              </div>
            </div>

            {/* 실습 예정일 (실습 체크 시에만 표시) */}
            {formData.service_practice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>실습 예정일</label>
                <input
                  type="text"
                  placeholder="예: 2025-03"
                  className={styles.inputField}
                  value={formData.practice_planned_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      practice_planned_date: formatPracticeDate(e.target.value),
                    })
                  }
                  maxLength={7}
                  inputMode="numeric"
                />
              </motion.div>
            )}

            {/* 취업 희망 시기 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>취업 희망 시기</label>
              <div className={styles.radioGroup}>
                {["바로 취업", "3개월 준비", "6개월 준비"].map((option) => (
                  <label key={option} className={styles.radioLabel}>
                    <span>{option}</span>
                    <input
                      type="radio"
                      name="employment_hope_time"
                      value={option}
                      checked={formData.employment_hope_time === option}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employment_hope_time: e.target.value,
                        })
                      }
                      className={styles.radio}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* 취업지원금 희망여부 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>취업지원금 희망여부</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <span>희망함</span>
                  <input
                    type="radio"
                    name="employment_support_fund"
                    value="희망함"
                    checked={formData.employment_support_fund === "희망함"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employment_support_fund: e.target.value as
                          | "희망함"
                          | "희망하지 않음",
                      })
                    }
                    className={styles.radio}
                  />
                </label>
                <label className={styles.radioLabel}>
                  <span>희망하지 않음</span>
                  <input
                    type="radio"
                    name="employment_support_fund"
                    value="희망하지 않음"
                    checked={
                      formData.employment_support_fund === "희망하지 않음"
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employment_support_fund: e.target.value as
                          | "희망함"
                          | "희망하지 않음",
                      })
                    }
                    className={styles.radio}
                  />
                </label>
              </div>
            </div>

            {/* 개인정보처리방침 동의 */}
            <div className={styles.inputGroup}>
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
                  동의 (필수)
                </span>
              </label>
            </div>

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
                {privacyData.map((item) => (
                  <p key={item.id} className={styles.modalPrivacyItem} style={{ whiteSpace: "pre-line" }}>
                    <strong>{item.title}</strong>
                    {"\n"}
                    {item.content}
                  </p>
                ))}
                <p className={styles.modalPrivacyItem}>
                  <strong>공고일자:</strong> 2026년 1월 29일<br />
                  <strong>시행일자:</strong> 2026년 1월 29일
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepFlowPage() {
  const [clickSource, setClickSource] = useState<string>("취업상담신청");

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
