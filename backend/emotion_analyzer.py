from transformers import pipeline
import torch
import logging
import re

logger = logging.getLogger(__name__)

class EmotionAnalyzer:
    def __init__(self):
        self.sentiment_analyzer = None
        self.emotion_classifier = None
        self._model_loaded = False
        
        self.critical_phrases = {
            "тревога": [
                "хочу умереть", "не хочу жить", "суицид", "покончить с собой",
                "лучше бы я умер", "не вижу смысла", "все безнадежно",
                "не могу больше", "устал от жизни", "нет сил"
            ],
            "грусть": [
                "очень грустно", "все плохо", "ничего не радует", "депрессия",
                "подавлен", "опустошен", "безнадежно", "бесполезно"
            ],
            "страх": [
                "боюсь", "страшно", "паника", "ужас", "тревожно", "опасно"
            ],
            "злость": [
                "ненавижу", "бесит", "злой", "ярость", "раздражает", "гнев"
            ],
            "радость": [
                "счастлив", "рад", "отлично", "прекрасно", "восторг", "радость",
                "замечательно", "чудесно", "восхитительно"
            ]
        }
    
    def _load_model(self):
        if self._model_loaded:
            return
        
        try:
            logger.info("Загрузка AI моделей для определения эмоций...")
            
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="blanchefort/rubert-base-cased-sentiment",
                device=0 if torch.cuda.is_available() else -1
            )
            
            self.emotion_classifier = pipeline(
                "zero-shot-classification",
                model="cointegrated/rubert-tiny2",
                device=0 if torch.cuda.is_available() else -1
            )
            
            self._model_loaded = True
            logger.info("AI модели загружены успешно")
        except Exception as e:
            logger.error(f"Ошибка загрузки AI моделей: {e}")
            try:
                logger.info("Пробуем альтернативные модели...")
                self.sentiment_analyzer = pipeline(
                    "sentiment-analysis",
                    model="nlptown/bert-base-multilingual-uncased-sentiment",
                    device=0 if torch.cuda.is_available() else -1
                )
                self._model_loaded = True
                logger.info("Альтернативные модели загружены успешно")
            except Exception as e2:
                logger.warning(f"Не удалось загрузить модели: {e2}")
                self._model_loaded = False
    
    def _check_critical_phrases(self, text: str) -> tuple:
        text_lower = text.lower()
        
        for emotion, phrases in self.critical_phrases.items():
            for phrase in phrases:
                if phrase in text_lower:
                    logger.warning(f"Обнаружена критическая фраза для эмоции '{emotion}': '{phrase}'")
                    return emotion, 0.9
        
        return None, 0.0
    
    def analyze(self, text: str) -> dict:
        if not text or not text.strip():
            return {
                "emotion": "спокойствие",
                "intensity": 0.5,
                "sentiment_score": 0.5
            }
        
        text_lower = text.lower()
        
        critical_emotion, critical_intensity = self._check_critical_phrases(text)
        if critical_emotion:
            return {
                "emotion": critical_emotion,
                "intensity": critical_intensity,
                "sentiment_score": critical_intensity
            }
        
        if not self._model_loaded:
            try:
                self._load_model()
            except Exception as e:
                logger.warning(f"Не удалось загрузить AI модели: {e}")
        
        emotion_scores = {}
        
        if self.sentiment_analyzer is not None:
            try:
                sentiment_result = self.sentiment_analyzer(text)[0]
                sentiment_label = sentiment_result["label"].lower()
                sentiment_score = sentiment_result["score"]
                
                if "negative" in sentiment_label or "негативн" in sentiment_label:
                    emotion_scores["грусть"] = sentiment_score * 0.8
                    emotion_scores["тревога"] = sentiment_score * 0.6
                elif "positive" in sentiment_label or "позитивн" in sentiment_label:
                    emotion_scores["радость"] = sentiment_score * 0.8
                    emotion_scores["спокойствие"] = sentiment_score * 0.5
                else:
                    emotion_scores["спокойствие"] = sentiment_score * 0.6
            except Exception as e:
                logger.warning(f"Ошибка sentiment анализа: {e}")
        
        if self.emotion_classifier is not None:
            try:
                emotion_labels = ["радость", "грусть", "злость", "страх", "спокойствие", "тревога"]
                result = self.emotion_classifier(text, emotion_labels)
                
                for label, score in zip(result["labels"], result["scores"]):
                    if label in emotion_scores:
                        emotion_scores[label] = max(emotion_scores[label], score)
                    else:
                        emotion_scores[label] = score
            except Exception as e:
                logger.warning(f"Ошибка emotion classification: {e}")
        
        if not emotion_scores:
            negative_words = ["плохо", "грустно", "ужасно", "страшно", "боюсь", "ненавижу", "умереть", "смерть"]
            positive_words = ["хорошо", "отлично", "рад", "счастлив", "прекрасно"]
            
            has_negative = any(word in text_lower for word in negative_words)
            has_positive = any(word in text_lower for word in positive_words)
            
            if has_negative and not has_positive:
                detected_emotion = "грусть"
                intensity = 0.7
            elif has_positive:
                detected_emotion = "радость"
                intensity = 0.6
            else:
                detected_emotion = "спокойствие"
                intensity = 0.5
        else:
            detected_emotion = max(emotion_scores, key=emotion_scores.get)
            intensity = min(emotion_scores[detected_emotion], 1.0)
        
        intensity = max(0.3, min(1.0, intensity))
        
        logger.info(f"Определена эмоция: {detected_emotion} (интенсивность: {intensity:.2f})")
        
        return {
            "emotion": detected_emotion,
            "intensity": intensity,
            "sentiment_score": intensity
        }

emotion_analyzer = EmotionAnalyzer()

