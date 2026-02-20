import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const EditableText = ({ tag, translationKey, children, style, className, isHtml = false }) => {
    const { editMode, updateTranslation } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(children);

    React.useEffect(() => {
        setValue(children);
    }, [children]);

    if (!editMode) {
        if (isHtml) {
            return React.createElement(tag, {
                className,
                style,
                dangerouslySetInnerHTML: { __html: children }
            });
        }
        return React.createElement(tag, { className, style }, children);
    }

    const handleClick = (e) => {
        if (editMode) {
            e.preventDefault();
            e.stopPropagation();
            setIsEditing(true);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (value !== children) {
            updateTranslation(translationKey, value);
        }
    };

    const handleChange = (e) => {
        setValue(e.target.value);
    };

    if (isEditing) {
        return (
            <textarea
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                autoFocus
                style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '2px solid var(--color-secondary)',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    ...style
                }}
            />
        );
    }

    return React.createElement(tag, {
        className: `${className || ''} editable-active`,
        style: {
            ...style,
            outline: '2px dashed var(--color-secondary)',
            outlineOffset: '4px',
            cursor: 'text',
            position: 'relative'
        },
        onClick: handleClick,
        title: "Cliquez pour éditer"
    }, isHtml ? <span dangerouslySetInnerHTML={{ __html: children }} /> : children);
};

export default EditableText;
