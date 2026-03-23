'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, ArrowRight, ArrowLeft, User, Check, Users } from 'lucide-react';
import Image from 'next/image';
import { useCharacterStore, CharacterTemplate } from '@/store/character-store';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useLanguageStore } from '@/store/language-store';

// User gender options
const USER_GENDERS = [
    { value: 'MALE', label: 'Nam', emoji: '👨' },
    { value: 'FEMALE', label: 'Nữ', emoji: '👩' },
    { value: 'NON_BINARY', label: 'Phi nhị giới', emoji: '🧑' },
    { value: 'OTHER', label: 'Khác', emoji: '🌈' },
    { value: 'NOT_SPECIFIED', label: 'Không muốn nói', emoji: '🤫' },
];

// Dating preference options
const DATING_PREFERENCES = [
    { value: 'MALE', label: 'Nam', description: 'Tôi muốn hẹn hò với nam', emoji: '👨' },
    { value: 'FEMALE', label: 'Nữ', description: 'Tôi muốn hẹn hò với nữ', emoji: '👩' },
    { value: 'NON_BINARY', label: 'Phi nhị giới', description: 'Tôi muốn hẹn hò với người phi nhị giới', emoji: '🧑' },
    { value: 'ALL', label: 'Tất cả', description: 'Tôi không có giới hạn về giới tính', emoji: '💕' },
];

const OCCUPATIONS = [
    { value: 'student', label: 'Sinh viên', emoji: '📚' },
    { value: 'office_worker', label: 'Nhân viên văn phòng', emoji: '💼' },
    { value: 'teacher', label: 'Giáo viên', emoji: '👩‍🏫' },
    { value: 'nurse', label: 'Y tá / Bác sĩ', emoji: '👩‍⚕️' },
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

const TOTAL_STEPS = 7;

export default function OnboardingPage() {
    const router = useRouter();
    const { createCharacter } = useCharacterStore();
    const { isAuthenticated } = useAuthStore();
    const { toast } = useToast();
    const { language } = useLanguageStore();
    const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
    const [step, setStep] = useState(1);
    const [isCreating, setIsCreating] = useState(false);
    const [templates, setTemplates] = useState<CharacterTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

    // Auth guard
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isAuthenticated, router]);

    // Fetch templates
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await api.get<CharacterTemplate[]>('/character/templates');
                if (response.success && response.data) {
                    setTemplates(response.data);
                    if (response.data.length === 0) {
                        toast({
                            title: tr('Cảnh báo', 'Warning'),
                            description: tr('Không tìm thấy mẫu nhân vật. Vui lòng liên hệ hỗ trợ.', 'No character templates found. Please contact support.'),
                            variant: 'destructive',
                        });
                    }
                } else {
                    toast({
                        title: tr('Lỗi tải dữ liệu', 'Data loading error'),
                        description: tr('Không thể tải danh sách mẫu nhân vật.', 'Could not load character templates.'),
                        variant: 'destructive',
                    });
                }
            } catch (error) {
                console.error('Failed to fetch templates:', error);
                toast({
                    title: tr('Lỗi kết nối', 'Connection error'),
                    description: tr('Không thể kết nối đến server. Vui lòng thử lại.', 'Could not connect to server. Please try again.'),
                    variant: 'destructive',
                });
            } finally {
                setIsLoadingTemplates(false);
            }
        };
        fetchTemplates();
    }, [toast]);

    const [formData, setFormData] = useState({
        userGender: 'NOT_SPECIFIED',
        datingPreference: 'ALL',
        name: '',
        age: 22,
        occupation: 'student',
        personality: 'caring',
        templateId: '',
        avatarUrl: '',
        gender: 'FEMALE' as 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER',
    });

    // Filter templates based on dating preference
    const filteredTemplates = useMemo(() => {
        if (formData.datingPreference === 'ALL') {
            return templates;
        }
        // Map dating preference to gender
        const preferenceToGender: Record<string, string[]> = {
            MALE: ['MALE'],
            FEMALE: ['FEMALE'],
            NON_BINARY: ['NON_BINARY', 'OTHER'],
        };
        const allowedGenders = preferenceToGender[formData.datingPreference] || [];
        return templates.filter(t => allowedGenders.includes(t.gender));
    }, [templates, formData.datingPreference]);

    const handleSelectTemplate = (template: CharacterTemplate) => {
        setFormData({
            ...formData,
            templateId: template.id,
            avatarUrl: template.avatarUrl,
            name: formData.name || template.name,
            personality: template.personality,
            gender: template.gender as 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER',
        });
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleCreate = async () => {
        // Validate template selection
        if (!formData.templateId) {
            toast({
                title: tr('Thiếu thông tin', 'Missing information'),
                description: tr('Vui lòng chọn mẫu nhân vật trước khi tiếp tục.', 'Please choose a character template before continuing.'),
                variant: 'destructive',
            });
            return;
        }

        setIsCreating(true);
        try {
            await createCharacter({
                name: formData.name || 'Người ấy',
                gender: formData.gender,
                personality: formData.personality as 'caring' | 'playful' | 'shy' | 'passionate' | 'intellectual',
                age: formData.age,
                occupation: formData.occupation,
                templateId: formData.templateId || undefined,
                avatarUrl: formData.avatarUrl || undefined,
            });

            // Update user preferences
            try {
                await api.patch('/users/profile', {
                    userGender: formData.userGender,
                    datingPreference: formData.datingPreference,
                });
            } catch (e) {
                console.error('Failed to update user preferences:', e);
            }

            toast({
                title: tr('Thành công!', 'Success!'),
                description: tr('Đã tạo nhân vật thành công.', 'Character created successfully.'),
            });

            router.push('/dashboard');
        } catch (error: any) {
            console.error('Failed to create character:', error);

            let errorMessage = tr('Không thể tạo người yêu ảo. Vui lòng thử lại!', 'Could not create your AI companion. Please try again!');

            if (error?.response?.status === 400) {
                errorMessage = tr('Thông tin nhân vật không hợp lệ. Vui lòng kiểm tra lại.', 'Invalid character data. Please review your inputs.');
            } else if (error?.response?.status === 401) {
                errorMessage = tr('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'Session expired. Please sign in again.');
                setTimeout(() => router.push('/auth/login'), 2000);
            } else if (error?.response?.status === 500) {
                errorMessage = tr('Lỗi server. Vui lòng thử lại sau ít phút.', 'Server error. Please try again in a few minutes.');
            } else if (error?.message) {
                errorMessage = error.message;
            }

            toast({
                title: tr('Lỗi tạo nhân vật', 'Character creation failed'),
                description: errorMessage,
                variant: 'destructive',
            });
            setIsCreating(false);
        }
    };

    const canProceed = () => {
        if (step === 1) return formData.userGender !== '';
        if (step === 2) return formData.datingPreference !== '';
        if (step === 3) return formData.templateId !== '';
        if (step === 4) return formData.name.trim().length > 0;
        return true;
    };

    const selectedTemplate = templates.find(t => t.id === formData.templateId);

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
                        {tr('Tạo Nhân Vật', 'Create Your')} <span className="text-love">AI</span>
                    </h1>
                    <p className="text-[#ba9cab]">
                        {tr('Hãy cho chúng tôi biết về bạn và người bạn đồng hành lý tưởng', 'Tell us about you and your ideal companion')}
                    </p>
                </motion.div>

                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                        <div
                            key={s}
                            className={`h-2 rounded-full transition-all ${s === step ? 'w-12 bg-love' : s < step ? 'w-8 bg-love/50' : 'w-8 bg-[#392830]'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#271b21] border border-[#392830] rounded-2xl p-8 mb-6"
                    >
                        {/* Step 1: User Gender Identity */}
                        {step === 1 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                    <Users className="w-6 h-6 text-love" />
                                    {tr('Bạn là ai?', 'Who are you?')}
                                </h2>
                                <p className="text-[#ba9cab] mb-6">
                                    {tr('Cho chúng tôi biết về bản thân bạn (không bắt buộc)', 'Tell us about yourself (optional)')}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {USER_GENDERS.map((gender) => (
                                        <button
                                            key={gender.value}
                                            onClick={() => setFormData({ ...formData, userGender: gender.value })}
                                            className={`p-4 rounded-xl border-2 transition-all text-center ${
                                                formData.userGender === gender.value
                                                    ? 'border-love bg-love/10'
                                                    : 'border-[#392830] bg-[#392830]/30 hover:border-[#4a3640]'
                                            }`}
                                        >
                                            <div className="text-3xl mb-2">{gender.emoji}</div>
                                            <div className="font-medium">{gender.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Dating Preference */}
                        {step === 2 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                    <Heart className="w-6 h-6 text-love" />
                                    {tr('Bạn muốn hẹn hò với ai?', 'Who do you want to date?')}
                                </h2>
                                <p className="text-[#ba9cab] mb-6">
                                    {tr('Chọn giới tính người bạn muốn đồng hành', 'Choose the gender you want to connect with')}
                                </p>
                                <div className="space-y-3">
                                    {DATING_PREFERENCES.map((pref) => (
                                        <button
                                            key={pref.value}
                                            onClick={() => setFormData({ ...formData, datingPreference: pref.value, templateId: '' })}
                                            className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                                                formData.datingPreference === pref.value
                                                    ? 'border-love bg-love/10'
                                                    : 'border-[#392830] bg-[#392830]/30 hover:border-[#4a3640]'
                                            }`}
                                        >
                                            <div className="text-3xl">{pref.emoji}</div>
                                            <div>
                                                <div className="font-bold">{pref.label}</div>
                                                <div className="text-sm text-[#ba9cab]">{pref.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Choose Template */}
                        {step === 3 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-love" />
                                    {tr('Chọn nhân vật', 'Choose character')}
                                </h2>
                                <p className="text-[#ba9cab] mb-6">
                                    {tr('Chọn một nhân vật phù hợp với sở thích của bạn', 'Choose a character that matches your preference')}
                                </p>

                                {isLoadingTemplates ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 border-2 border-love border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="text-center py-12 text-[#ba9cab]">
                                        {tr('Không tìm thấy nhân vật phù hợp. Vui lòng quay lại chọn sở thích khác.', 'No matching characters found. Please go back and choose a different preference.')}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {filteredTemplates.map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => handleSelectTemplate(template)}
                                                className={`relative group rounded-xl border-2 p-3 transition-all text-center ${
                                                    formData.templateId === template.id
                                                        ? 'border-love bg-love/10 shadow-[0_0_20px_rgba(244,37,140,0.2)]'
                                                        : 'border-[#392830] bg-[#392830]/30 hover:border-[#4a3640] hover:bg-[#392830]/50'
                                                }`}
                                            >
                                                {formData.templateId === template.id && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-love flex items-center justify-center z-10">
                                                        <Check className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-[#181114] mb-3">
                                                    {template.avatarUrl ? (
                                                        <Image
                                                            src={template.avatarUrl}
                                                            alt={template.name}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform"
                                                            sizes="(max-width: 640px) 50vw, 25vw"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <User className="w-12 h-12 text-[#4a3640]" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-bold text-sm">{template.name}</div>
                                                <div className="text-xs text-[#ba9cab] mt-1 line-clamp-2">{template.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Name */}
                        {step === 4 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-love" />
                                    {tr('Đặt tên', 'Set a name')}
                                </h2>
                                <p className="text-[#ba9cab] mb-6">
                                    {tr('Bạn có thể giữ tên gốc hoặc đặt tên mới', 'You can keep the original name or set a new one')}
                                </p>

                                {selectedTemplate && (
                                    <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-[#181114] border border-[#392830]">
                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#392830]">
                                            {selectedTemplate.avatarUrl ? (
                                                <Image
                                                    src={selectedTemplate.avatarUrl}
                                                    alt={selectedTemplate.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <User className="w-8 h-8 text-[#4a3640]" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm text-[#ba9cab]">{tr('Nhân vật đã chọn', 'Selected character')}</div>
                                            <div className="font-bold">{selectedTemplate.name}</div>
                                        </div>
                                    </div>
                                )}

                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ví dụ: Mai, Minh, Alex..."
                                    className="w-full px-6 py-4 bg-[#392830] border border-[#4a3640] rounded-xl text-white placeholder:text-[#ba9cab]/50 focus:outline-none focus:border-love transition-colors text-lg"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Step 5: Age */}
                        {step === 5 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-2">{tr('Người ấy bao nhiêu tuổi?', 'How old is your companion?')}</h2>
                                <p className="text-[#ba9cab] mb-6">
                                    {tr('Chọn độ tuổi phù hợp (18-30 tuổi)', 'Choose an age range (18-30)')}
                                </p>
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <span className="text-6xl font-bold text-love">{formData.age}</span>
                                        <span className="text-2xl text-[#ba9cab] ml-2">{tr('tuổi', 'years')}</span>
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

                        {/* Step 6: Occupation */}
                        {step === 6 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-2">{tr('Nghề nghiệp của người ấy?', 'Companion occupation?')}</h2>
                                <p className="text-[#ba9cab] mb-6">
                                    {tr('Chọn nghề nghiệp để AI có thể trò chuyện phù hợp', 'Choose an occupation to help AI chat more naturally')}
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

                        {/* Step 7: Personality */}
                        {step === 7 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-2">{tr('Tính cách?', 'Personality?')}</h2>
                                <p className="text-[#ba9cab] mb-6">
                                    {tr('Chọn tính cách phù hợp với sở thích của bạn', 'Choose a personality that fits your preference')}
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
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-4">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#392830] hover:bg-[#4a3640] transition-colors font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {tr('Quay lại', 'Back')}
                        </button>
                    )}
                    <button
                        onClick={step === TOTAL_STEPS ? handleCreate : handleNext}
                        disabled={!canProceed() || isCreating}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-love hover:bg-love/90 disabled:bg-[#392830] disabled:cursor-not-allowed transition-colors font-bold shadow-[0_0_20px_rgba(244,37,140,0.3)]"
                    >
                        {isCreating ? (
                            tr('Đang tạo...', 'Creating...')
                        ) : step === TOTAL_STEPS ? (
                            <>
                                <Heart className="w-5 h-5" />
                                {tr('Tạo người yêu ảo', 'Create AI companion')}
                            </>
                        ) : (
                            <>
                                {tr('Tiếp theo', 'Next')}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
