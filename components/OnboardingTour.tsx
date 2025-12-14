
import React, { useState } from 'react';
import { ChevronRight, Check, X, Zap, ShieldCheck, PenTool } from 'lucide-react';

interface OnboardingTourProps {
    onComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to MyClassroom AI",
            desc: "The comprehensive educational assistant that generates personalized learning content.",
            icon: Zap,
            color: "text-yellow-500",
            bg: "bg-yellow-50"
        },
        {
            title: "AI Test Generator",
            desc: "Teachers can create comprehensive exams in seconds from a simple text prompt.",
            icon: PenTool,
            color: "text-purple-500",
            bg: "bg-purple-50"
        },
        {
            title: "AI Proctoring System",
            desc: "Secure, real-time monitoring ensures integrity during student exams.",
            icon: ShieldCheck,
            color: "text-red-500",
            bg: "bg-red-50"
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const CurrentIcon = steps[step].icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl p-8 relative overflow-hidden animate-slide-in">
                {/* Background Decor */}
                <div className={`absolute top-0 left-0 w-full h-2 ${step === 0 ? 'bg-yellow-500' : step === 1 ? 'bg-purple-500' : 'bg-red-500'} transition-colors duration-500`}></div>
                
                <button onClick={onComplete} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>

                <div className="flex flex-col items-center text-center mt-4">
                    <div className={`w-20 h-20 ${steps[step].bg} rounded-full flex items-center justify-center mb-6 transition-colors duration-500`}>
                        <CurrentIcon className={`w-10 h-10 ${steps[step].color} transition-colors duration-500`} />
                    </div>
                    
                    <h2 className="text-2xl font-bold dark:text-white mb-2 transition-opacity duration-300">{steps[step].title}</h2>
                    <p className="text-gray-500 mb-8 min-h-[60px] transition-opacity duration-300">{steps[step].desc}</p>

                    <div className="flex gap-2 mb-8">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-gray-800 dark:bg-white' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}></div>
                        ))}
                    </div>

                    <button 
                        onClick={handleNext}
                        className="w-full bg-black dark:bg-white dark:text-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    >
                        {step === steps.length - 1 ? "Get Started" : "Next"}
                        {step === steps.length - 1 ? <Check className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
