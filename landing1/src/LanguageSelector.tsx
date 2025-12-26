
import { useLanguage, LanguageCode } from './LanguageContext';

interface LanguageSelectorProps {
    variant?: 'dropdown' | 'buttons';
    className?: string;
}

export function LanguageSelector({ variant = 'dropdown', className = '' }: LanguageSelectorProps) {
    const { language, setLanguage, availableLanguages, t } = useLanguage();

    if (variant === 'buttons') {
        return (
            <div className={`flex flex-wrap gap-2 ${className}`}>
                {availableLanguages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${language === lang.code
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                            }`}
                    >
                        {lang.name}
                    </button>
                ))}
            </div>
        );
    }

    // Dropdown variant (default)
    return (
        <div className={`relative ${className}`}>
            <label className="block text-xs text-white/50 mb-1">
                {t('language')}
            </label>
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm appearance-none cursor-pointer hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px'
                }}
            >
                {availableLanguages.map((lang) => (
                    <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-gray-800 text-white"
                    >
                        {lang.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

// Compact version for navbar/header
export function LanguageSelectorCompact({ className = '' }: { className?: string }) {
    const { language, setLanguage, availableLanguages } = useLanguage();

    return (
        <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className={`px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs appearance-none cursor-pointer hover:bg-white/15 transition-colors focus:outline-none ${className}`}
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 4px center',
                backgroundSize: '12px',
                paddingRight: '20px'
            }}
        >
            {availableLanguages.map((lang) => (
                <option
                    key={lang.code}
                    value={lang.code}
                    className="bg-gray-800 text-white"
                >
                    {lang.code.toUpperCase()}
                </option>
            ))}
        </select>
    );
}

export default LanguageSelector;
