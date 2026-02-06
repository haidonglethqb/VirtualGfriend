'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useCharacterStore } from '@/store/character-store';

const OCCUPATIONS = [
    { value: 'student', label: 'Sinh viên', emoji: '📚' },
    { value: 'office_worker', label: 'Nhân viên văn phòng', emoji: '💼' },
    { value: 'teacher', label: 'Giáo viên', emoji: '👩‍🏫' },
    { value: 'nurse', label: 'Y tá', emoji: '👩‍⚕️' },
    { value: 'artist', label: 'Nghệ sĩ', emoji: '🎨' },
    { value: 'developer', label: 'Lập trình viên', emoji: '💻' },
    { value: 'sales', label: 'Nhân viên bán hàng', emoji: '🛍️' },
    { value: 'freelancer', label: 'Freelancer', emoji: '🌟' },
];

const PERSONALITIES = [
    { value: 'caring', label: 'Quan tâm', description: 'Luôn chăm sóc và lo lắng cho bạn' },
    { value: 'playful', label: 'Vui vẻ', description: 'Năng động, hay đùa và vui tính' },
    { value: 'shy', label: 'Nhút nhát', description: 'Dễ thương, ngại ngùng và dễ xấu hổ' },
    { value: 'passionate', label: 'Nhiệt huyết', description: 'Mạnh mẽ, quyết đoán và đam mê' },
    { value: 'intellectual', label: 'Trí tuệ', description: 'Thông minh, sâu sắc và triết lý' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { createCharacter } = useCharacterStore();
    const [step, setStep] = useState(1);
    const [isCreating, setIsCreating] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        age: 22,
        occupation: 'student',
        personality: 'caring',
    });

    const handleNext = () => {
        if (step < 4) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            await createCharacter({
                name: formData.name || 'Mai',
                gender: 'FEMALE',
                personality: formData.personality as 'caring' | 'playful' | 'shy' | 'passionate' | 'intellectual',
                age: formData.age,
                occupation: formData.occupation,
            });
            router.push('/dashboard');
        } catch (error) {
            console.error('Failed to create character:', error);
            setIsCreating(false);
        }
    };

    const canProceed = () => {
        if (step === 1) return formData.name.trim().length > 0;
        return true;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#181114] via-[#1a0e15] to-[#181114] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-love to-pink-600 mb-4 shadow-[0_0_40px_rgba(244,37,140,0.4)]">
                        <Heart className="w-10 h-10 text-white fill-white" />
                    </div>
                    <h1 className="text-4xl font-bold mb-2">
                        Tạo <span className="text-love">Người Yêu Ảo</span>
                    </h1>
                    <p className="text-[#ba9cab]">
                        Hãy tùy chỉnh người bạn gái ảo của bạn
                    </p>
                </motion.div>

                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`h-2 rounded-full transition-all ${s === step ? 'w-12 bg-love' : s < step ? 'w-8 bg-love/50' : 'w-8 bg-[#392830]'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-[#271b21] border border-[#392830] rounded-2xl p-8 mb-6"
                >
                    {/* Step 1: Name */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-love" />
                                Tên của cô ấy là gì?
                            </h2>
                            <p className="text-[#ba9cab] mb-6">
                                Đặt một cái tên đẹp cho người yêu ảo của bạn
                            </p>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ví dụ: Mai, Linh, Hương..."
                                className="w-full px-6 py-4 bg-[#392830] border border-[#4a3640] rounded-xl text-white placeholder:text-[#ba9cab]/50 focus:outline-none focus:border-love transition-colors text-lg"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Step 2: Age */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Cô ấy bao nhiêu tuổi?</h2>
                            <p className="text-[#ba9cab] mb-6">
                                Chọn độ tuổi phù hợp (18-30 tuổi)
                            </p>
                            <div className="space-y-4">
                                <div className="text-center">
                                    <span className="text-6xl font-bold text-love">{formData.age}</span>
                                    <span className="text-2xl text-[#ba9cab] ml-2">tuổi</span>
                                </div>
                                <input
                                    type="range"
                                    min="18"
                                    max="30"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                                    className="w-full h-3 bg-[#392830] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-love [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(244,37,140,0.5)]"
                                />
                                <div className="flex justify-between text-sm text-[#ba9cab]">
                                    <span>18</span>
                                    <span>30</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Occupation */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Nghề nghiệp của cô ấy?</h2>
                            <p className="text-[#ba9cab] mb-6">
                                Chọn nghề nghiệp để AI có thể trò chuyện phù hợp
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {OCCUPATIONS.map((occ) => (
                                    <button
                                        key={occ.value}
                                        onClick={() => setFormData({ ...formData, occupation: occ.value })}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${formData.occupation === occ.value
                                                ? 'border-love bg-love/10'
                                                : 'border-[#392830] bg-[#392830]/30 hover:border-[#4a3640]'
                                            }`}
                                    >
                                        <div className="text-3xl mb-2">{occ.emoji}</div>
                                        <div className="font-medium">{occ.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Personality */}
                    {step === 4 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Tính cách của cô ấy?</h2>
                            <p className="text-[#ba9cab] mb-6">
                                Chọn tính cách phù hợp với sở thích của bạn
                            </p>
                            <div className="space-y-3">
                                {PERSONALITIES.map((pers) => (
                                    <button
                                        key={pers.value}
                                        onClick={() => setFormData({ ...formData, personality: pers.value })}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${formData.personality === pers.value
                                                ? 'border-love bg-love/10'
                                                : 'border-[#392830] bg-[#392830]/30 hover:border-[#4a3640]'
                                            }`}
                                    >
                                        <div className="font-bold mb-1">{pers.label}</div>
                                        <div className="text-sm text-[#ba9cab]">{pers.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Actions */}
                <div className="flex gap-4">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="px-6 py-3 rounded-full bg-[#392830] hover:bg-[#4a3640] transition-colors font-medium"
                        >
                            Quay lại
                        </button>
                    )}
                    <button
                        onClick={step === 4 ? handleCreate : handleNext}
                        disabled={!canProceed() || isCreating}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-love hover:bg-love/90 disabled:bg-[#392830] disabled:cursor-not-allowed transition-colors font-bold shadow-[0_0_20px_rgba(244,37,140,0.3)]"
                    >
                        {isCreating ? (
                            'Đang tạo...'
                        ) : step === 4 ? (
                            <>
                                <Heart className="w-5 h-5" />
                                Tạo người yêu ảo
                            </>
                        ) : (
                            <>
                                Tiếp theo
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
