// src/features/Reader/components/Segment.tsx
import React, { useMemo } from 'react';
import { Furigana } from '../../../components/Furigana.tsx';
import { PitchAccentVisualizer } from '../../../components/PitchAccentVisualizer.tsx';
import { AddToDeckButton } from './AddToDeckButton.tsx';
import { getCategoryClass } from '../../../utils/style-utils.ts';
import { useSettings, useUI } from '../../../contexts/index.ts';

const SegmentDetails = ({ segment }: { segment: any }) => (
    <div>
         <div className="text-lg font-japanese font-semibold mb-3 pb-2 border-b border-border-subtle"><Furigana base={segment.japanese_segment} reading={segment.reading || ''} interactiveKanji/></div>
         <div className="space-y-2 text-sm">
            <p><strong className="font-medium text-text-secondary">Meaning:</strong> {segment.english_equivalent}</p>
            <p><strong className="font-medium text-text-secondary">Category:</strong> <span className="capitalize">{segment.category.replace(/_/g, ' ').toLowerCase()}</span></p>
            <p><strong className="font-medium text-text-secondary">Reading:</strong> {segment.reading}</p>
        </div>
        <div className="mt-4 pt-3 border-t border-border-subtle">
            <AddToDeckButton itemId={`word-${segment.japanese_segment}-${segment.reading}`} itemType="word" itemContent={segment} />
        </div>
    </div>
);

export const Segment = ({ segment }: { segment: any }) => {
    const { state: settingsState } = useSettings();
    const { state: uiState, dispatch: uiDispatch } = useUI();
    const { japanese_segment, reading, category, pitch_accent, patterns } = segment;

    const handleClick = (event: React.MouseEvent) => {
        const target = event.currentTarget as HTMLElement;
        const content = <SegmentDetails segment={segment} />;

        if (window.innerWidth < 768) { // Use BottomSheet on mobile
            if (uiState.bottomSheet.visible && uiState.bottomSheet.targetElement === target) {
                uiDispatch({ type: 'HIDE_BOTTOM_SHEET' });
            } else {
                uiDispatch({ type: 'SHOW_BOTTOM_SHEET', payload: { content: { title: japanese_segment, body: content }, targetElement: target } });
            }
        } else { // Use Tooltip on desktop
             const rect = target.getBoundingClientRect();
             const pos = { top: rect.top - 10, left: rect.left + rect.width / 2 };
             uiDispatch({ type: 'PIN_TOOLTIP', payload: { content, position: pos, targetElement: target } });
        }
    };

    const patternStyles = useMemo(() => {
        if (!patterns || patterns.length === 0) {
            return {};
        }

        const underlineHeight = 3; // px
        const underlineGap = 2; // px
        const totalUnderlineHeightWithGap = underlineHeight + underlineGap;

        const gradients = patterns.map((p: any) => 
            `linear-gradient(to right, ${p.color}, ${p.color})`
        ).join(', ');

        const positions = patterns.map((_: any, i: number) => 
            `0 calc(100% - ${i * totalUnderlineHeightWithGap}px)`
        ).join(', ');
        
        const sizes = patterns.map(() => `100% ${underlineHeight}px`).join(', ');

        const basePaddingBottom = 4; // from original 0.25rem
        const extraPadding = (patterns.length * totalUnderlineHeightWithGap) - underlineGap; // Don't add gap below the last line

        return {
            backgroundImage: gradients,
            backgroundPosition: positions,
            backgroundSize: sizes,
            paddingBottom: `${basePaddingBottom + extraPadding}px`,
        };
    }, [patterns]);

    const classNames = [
        'segment', 'relative', 'inline-block', 'rounded-md', 'px-2', 'cursor-pointer',
        'transition-transform', 'duration-200', 'hover:-translate-y-0.5', 'leading-loose',
        settingsState.showColorCoding ? getCategoryClass(category) : 'bg-surface-soft',
        (patterns && patterns.length > 0) ? 'grammar-pattern' : ''
    ].filter(Boolean).join(' ');

    const finalStyle = {
        paddingTop: settingsState.showPitchAccent ? '18px' : '0.25rem',
        paddingBottom: '0.25rem', // default
        ...patternStyles, // override if patterns exist
    };

    return (
        <span
            className={classNames}
            style={finalStyle}
            onClick={handleClick}
        >
            <PitchAccentVisualizer reading={reading} pitchAccent={pitch_accent} />
            <div>
                <Furigana base={japanese_segment} reading={reading} />
            </div>
        </span>
    );
};