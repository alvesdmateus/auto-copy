import re
import math
from typing import List, Optional, Dict
from collections import Counter


class TextAnalyzer:
    """Service for analyzing text content."""

    # Common syllable patterns
    VOWELS = "aeiouy"
    CONSONANTS = "bcdfghjklmnpqrstvwxz"

    # Emotion keywords (simplified)
    EMOTION_KEYWORDS = {
        "joy": ["happy", "joy", "excited", "amazing", "wonderful", "love", "great", "fantastic", "awesome", "delighted"],
        "trust": ["trust", "reliable", "secure", "safe", "proven", "guaranteed", "certified", "authentic"],
        "fear": ["fear", "worried", "anxious", "urgent", "danger", "risk", "warning", "alert", "limited"],
        "surprise": ["surprise", "unexpected", "shocking", "incredible", "unbelievable", "wow", "astonishing"],
        "sadness": ["sad", "sorry", "unfortunately", "regret", "miss", "lost", "disappointed"],
        "anger": ["angry", "frustrated", "annoyed", "hate", "terrible", "awful", "worst"],
        "anticipation": ["soon", "coming", "upcoming", "expect", "wait", "future", "next", "new"],
    }

    # Positive/negative word lists (simplified)
    POSITIVE_WORDS = {
        "good", "great", "excellent", "amazing", "wonderful", "fantastic", "awesome",
        "best", "love", "happy", "joy", "success", "win", "perfect", "beautiful",
        "easy", "free", "save", "benefit", "improve", "grow", "achieve", "gain",
        "profit", "valuable", "quality", "premium", "exclusive", "guaranteed"
    }

    NEGATIVE_WORDS = {
        "bad", "terrible", "awful", "horrible", "worst", "hate", "sad", "fail",
        "lose", "problem", "issue", "difficult", "hard", "expensive", "cost",
        "risk", "danger", "warning", "mistake", "error", "wrong", "never"
    }

    # CTA keywords
    CTA_KEYWORDS = {
        "buy", "get", "start", "try", "join", "subscribe", "download", "sign up",
        "register", "learn", "discover", "click", "shop", "order", "book", "call",
        "contact", "claim", "grab", "unlock", "access", "reserve", "apply"
    }

    @staticmethod
    def count_syllables(word: str) -> int:
        """Count syllables in a word using a simple heuristic."""
        word = word.lower().strip()
        if len(word) <= 3:
            return 1

        # Remove trailing 'e'
        if word.endswith('e'):
            word = word[:-1]

        # Count vowel groups
        count = 0
        prev_vowel = False
        for char in word:
            is_vowel = char in TextAnalyzer.VOWELS
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel

        return max(1, count)

    @staticmethod
    def get_words(text: str) -> List[str]:
        """Extract words from text."""
        return re.findall(r'\b[a-zA-Z]+\b', text.lower())

    @staticmethod
    def get_sentences(text: str) -> List[str]:
        """Split text into sentences."""
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]

    @staticmethod
    def get_paragraphs(text: str) -> List[str]:
        """Split text into paragraphs."""
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if p.strip()]

    def analyze_readability(self, text: str) -> dict:
        """Calculate readability metrics."""
        words = self.get_words(text)
        sentences = self.get_sentences(text)
        paragraphs = self.get_paragraphs(text)

        word_count = len(words)
        sentence_count = max(1, len(sentences))
        paragraph_count = max(1, len(paragraphs))

        # Calculate syllables
        total_syllables = sum(self.count_syllables(w) for w in words)
        avg_syllables = total_syllables / max(1, word_count)

        # Words per sentence
        avg_words_per_sentence = word_count / sentence_count

        # Complex words (3+ syllables)
        complex_words = sum(1 for w in words if self.count_syllables(w) >= 3)

        # Flesch Reading Ease
        flesch_ease = 206.835 - (1.015 * avg_words_per_sentence) - (84.6 * avg_syllables)
        flesch_ease = max(0, min(100, flesch_ease))

        # Flesch-Kincaid Grade Level
        fk_grade = (0.39 * avg_words_per_sentence) + (11.8 * avg_syllables) - 15.59
        fk_grade = max(0, fk_grade)

        # Gunning Fog Index
        fog = 0.4 * (avg_words_per_sentence + 100 * (complex_words / max(1, word_count)))

        # SMOG Index
        smog = 1.0430 * math.sqrt(complex_words * (30 / max(1, sentence_count))) + 3.1291 if sentence_count >= 3 else fk_grade

        # Automated Readability Index
        char_count = sum(len(w) for w in words)
        ari = 4.71 * (char_count / max(1, word_count)) + 0.5 * avg_words_per_sentence - 21.43
        ari = max(0, ari)

        # Coleman-Liau Index
        L = (char_count / max(1, word_count)) * 100  # letters per 100 words
        S = (sentence_count / max(1, word_count)) * 100  # sentences per 100 words
        coleman = 0.0588 * L - 0.296 * S - 15.8
        coleman = max(0, coleman)

        # Average grade level
        avg_grade = (fk_grade + fog + smog + ari + coleman) / 5

        # Reading time (avg 200 words per minute)
        reading_time = int((word_count / 200) * 60)

        # Difficulty interpretation
        if flesch_ease >= 80:
            difficulty = "easy"
            audience = "General public, 6th grade"
        elif flesch_ease >= 60:
            difficulty = "moderate"
            audience = "8th-9th grade students"
        elif flesch_ease >= 40:
            difficulty = "difficult"
            audience = "College students"
        else:
            difficulty = "very_difficult"
            audience = "College graduates, professionals"

        return {
            "flesch_reading_ease": round(flesch_ease, 1),
            "flesch_kincaid_grade": round(fk_grade, 1),
            "gunning_fog": round(fog, 1),
            "smog_index": round(smog, 1),
            "automated_readability_index": round(ari, 1),
            "coleman_liau_index": round(coleman, 1),
            "avg_grade_level": round(avg_grade, 1),
            "reading_time_seconds": reading_time,
            "word_count": word_count,
            "sentence_count": sentence_count,
            "paragraph_count": paragraph_count,
            "avg_words_per_sentence": round(avg_words_per_sentence, 1),
            "avg_syllables_per_word": round(avg_syllables, 2),
            "difficulty_level": difficulty,
            "target_audience": audience,
        }

    def analyze_sentiment(self, text: str) -> dict:
        """Analyze sentiment and emotional tone."""
        words = self.get_words(text)
        word_set = set(words)
        text_lower = text.lower()

        # Count positive/negative words
        positive_count = len(word_set & self.POSITIVE_WORDS)
        negative_count = len(word_set & self.NEGATIVE_WORDS)
        total_sentiment_words = positive_count + negative_count

        # Calculate sentiment score (-1 to 1)
        if total_sentiment_words > 0:
            sentiment_score = (positive_count - negative_count) / total_sentiment_words
        else:
            sentiment_score = 0

        # Determine overall sentiment
        if sentiment_score > 0.3:
            overall = "positive"
        elif sentiment_score < -0.3:
            overall = "negative"
        elif positive_count > 0 and negative_count > 0:
            overall = "mixed"
        else:
            overall = "neutral"

        # Calculate confidence based on number of sentiment words
        confidence = min(1.0, total_sentiment_words / 10)

        # Analyze emotions
        emotions = []
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            matches = sum(1 for kw in keywords if kw in text_lower)
            if matches > 0:
                score = min(1.0, matches / 3)
                emotions.append({"emotion": emotion, "score": round(score, 2)})

        emotions.sort(key=lambda x: x["score"], reverse=True)

        # Tone indicators
        is_urgent = any(w in text_lower for w in ["urgent", "now", "today", "limited", "hurry", "fast", "immediately"])
        is_persuasive = any(w in text_lower for w in ["you", "your", "imagine", "discover", "proven", "guaranteed"])
        is_informative = any(w in text_lower for w in ["how", "what", "why", "learn", "guide", "tips", "steps"])
        is_casual = any(w in text_lower for w in ["hey", "awesome", "cool", "gonna", "wanna", "!"])
        is_formal = any(w in text_lower for w in ["therefore", "however", "furthermore", "regarding", "pursuant"])

        # CTA strength
        cta_count = sum(1 for kw in self.CTA_KEYWORDS if kw in text_lower)
        cta_strength = min(1.0, cta_count / 3)

        # Emotional appeal
        exclamations = text.count("!")
        questions = text.count("?")
        emotional_appeal = min(1.0, (len(emotions) * 0.2 + exclamations * 0.1 + (1 if is_urgent else 0) * 0.3))

        return {
            "overall_sentiment": overall,
            "sentiment_score": round(sentiment_score, 2),
            "confidence": round(confidence, 2),
            "emotions": emotions[:5],  # Top 5 emotions
            "is_urgent": is_urgent,
            "is_persuasive": is_persuasive,
            "is_informative": is_informative,
            "is_casual": is_casual,
            "is_formal": is_formal,
            "call_to_action_strength": round(cta_strength, 2),
            "emotional_appeal": round(emotional_appeal, 2),
        }

    def analyze_seo(self, text: str, target_keywords: Optional[List[str]] = None, content_type: str = "blog") -> dict:
        """Analyze SEO factors."""
        words = self.get_words(text)
        word_count = len(words)
        paragraphs = self.get_paragraphs(text)

        # Extract headings (markdown style)
        heading_pattern = r'^(#{1,6})\s+(.+)$'
        headings = []
        for line in text.split('\n'):
            match = re.match(heading_pattern, line.strip())
            if match:
                level = len(match.group(1))
                heading_text = match.group(2)
                headings.append({
                    "tag": f"h{level}",
                    "text": heading_text,
                    "word_count": len(heading_text.split())
                })

        has_h1 = any(h["tag"] == "h1" for h in headings)

        # Check heading hierarchy
        hierarchy_valid = True
        if headings:
            prev_level = 0
            for h in headings:
                level = int(h["tag"][1])
                if level > prev_level + 1 and prev_level > 0:
                    hierarchy_valid = False
                    break
                prev_level = level

        # Keyword analysis
        keyword_analysis = []
        text_lower = text.lower()
        first_para = paragraphs[0].lower() if paragraphs else ""
        heading_text = " ".join(h["text"].lower() for h in headings)

        if target_keywords:
            for kw in target_keywords:
                kw_lower = kw.lower()
                count = text_lower.count(kw_lower)
                density = (count / max(1, word_count)) * 100
                keyword_analysis.append({
                    "keyword": kw,
                    "count": count,
                    "density": round(density, 2),
                    "in_title": kw_lower in heading_text and headings and headings[0]["tag"] == "h1",
                    "in_headings": kw_lower in heading_text,
                    "in_first_paragraph": kw_lower in first_para,
                })

        # Check for keyword stuffing (any keyword > 3% density)
        keyword_stuffing = any(k["density"] > 3.0 for k in keyword_analysis)

        # Ideal word count by content type
        ideal_ranges = {
            "blog": "1500-2500",
            "landing": "500-1000",
            "product": "300-500",
            "social": "50-280",
            "email": "200-500",
        }

        # Paragraph analysis
        avg_para_length = sum(len(p.split()) for p in paragraphs) / max(1, len(paragraphs))
        short_paras = sum(1 for p in paragraphs if len(self.get_sentences(p)) < 3)
        short_para_ratio = short_paras / max(1, len(paragraphs))

        # Generate suggestions
        suggestions = []
        if not has_h1:
            suggestions.append("Add an H1 heading to your content")
        if not hierarchy_valid:
            suggestions.append("Fix heading hierarchy (don't skip levels)")
        if word_count < 300:
            suggestions.append("Consider adding more content (at least 300 words)")
        if avg_para_length > 100:
            suggestions.append("Break up long paragraphs for better readability")
        if keyword_analysis:
            missing_in_headings = [k["keyword"] for k in keyword_analysis if not k["in_headings"]]
            if missing_in_headings:
                suggestions.append(f"Include keywords in headings: {', '.join(missing_in_headings[:2])}")
            missing_in_first = [k["keyword"] for k in keyword_analysis if not k["in_first_paragraph"]]
            if missing_in_first:
                suggestions.append(f"Include keywords in first paragraph: {', '.join(missing_in_first[:2])}")
        if keyword_stuffing:
            suggestions.append("Reduce keyword density to avoid keyword stuffing")

        # Calculate SEO score
        score = 50  # Base score
        if has_h1:
            score += 10
        if hierarchy_valid:
            score += 5
        if word_count >= 300:
            score += 10
        if avg_para_length <= 100:
            score += 5
        if short_para_ratio >= 0.5:
            score += 5
        if keyword_analysis:
            good_keywords = sum(1 for k in keyword_analysis if 0.5 <= k["density"] <= 2.5)
            score += min(15, good_keywords * 5)
            if not keyword_stuffing:
                score += 5

        return {
            "seo_score": min(100, score),
            "word_count": word_count,
            "ideal_word_count_range": ideal_ranges.get(content_type, "500-1500"),
            "keywords": keyword_analysis,
            "keyword_stuffing_warning": keyword_stuffing,
            "headings": headings,
            "has_h1": has_h1,
            "heading_hierarchy_valid": hierarchy_valid,
            "paragraph_count": len(paragraphs),
            "avg_paragraph_length": round(avg_para_length, 1),
            "short_paragraphs_ratio": round(short_para_ratio, 2),
            "suggestions": suggestions,
        }

    def predict_engagement(self, text: str, content_type: str = "social", platform: Optional[str] = None) -> dict:
        """Predict engagement potential."""
        words = self.get_words(text)
        sentences = self.get_sentences(text)
        text_lower = text.lower()

        # Get component analyses
        readability = self.analyze_readability(text)
        sentiment = self.analyze_sentiment(text)

        # Headline/hook analysis (first sentence or line)
        first_line = text.split('\n')[0].strip() if text else ""
        first_sentence = sentences[0] if sentences else ""

        # Headline score
        headline_score = 50
        if first_line:
            # Length check
            if 6 <= len(first_line.split()) <= 12:
                headline_score += 15
            # Power words
            power_words = ["how", "why", "what", "best", "top", "new", "free", "secret", "proven", "ultimate"]
            if any(pw in first_line.lower() for pw in power_words):
                headline_score += 15
            # Numbers
            if re.search(r'\d+', first_line):
                headline_score += 10
            # Question or exclamation
            if first_line.endswith("?") or first_line.endswith("!"):
                headline_score += 10

        # Hook score (first 2 sentences)
        hook_score = 50
        hook_text = " ".join(sentences[:2]) if sentences else ""
        if hook_text:
            # Personal language
            if any(w in hook_text.lower() for w in ["you", "your", "imagine"]):
                hook_score += 15
            # Question
            if "?" in hook_text:
                hook_score += 10
            # Short and punchy
            if len(hook_text.split()) <= 30:
                hook_score += 10
            # Emotional words
            if sentiment["emotional_appeal"] > 0.3:
                hook_score += 15

        # Readability score for engagement
        read_score = min(100, readability["flesch_reading_ease"])

        # Emotional score
        emotional_score = int(sentiment["emotional_appeal"] * 50 + 50)

        # CTA score
        cta_score = int(sentiment["call_to_action_strength"] * 100)
        # Bonus if CTA at end
        last_para = text.split('\n')[-1].lower() if text else ""
        if any(cta in last_para for cta in self.CTA_KEYWORDS):
            cta_score = min(100, cta_score + 20)

        # Calculate overall engagement score
        weights = {
            "social": {"headline": 0.3, "hook": 0.25, "read": 0.15, "emotion": 0.2, "cta": 0.1},
            "email": {"headline": 0.35, "hook": 0.2, "read": 0.15, "emotion": 0.15, "cta": 0.15},
            "blog": {"headline": 0.2, "hook": 0.2, "read": 0.25, "emotion": 0.15, "cta": 0.2},
            "ad": {"headline": 0.25, "hook": 0.15, "read": 0.1, "emotion": 0.25, "cta": 0.25},
            "landing": {"headline": 0.25, "hook": 0.2, "read": 0.15, "emotion": 0.15, "cta": 0.25},
        }
        w = weights.get(content_type, weights["social"])
        overall = (
            headline_score * w["headline"] +
            hook_score * w["hook"] +
            read_score * w["read"] +
            emotional_score * w["emotion"] +
            cta_score * w["cta"]
        )

        # Predictions
        if overall >= 80:
            click_rate = "very_high"
            share_likelihood = "very_likely"
        elif overall >= 65:
            click_rate = "high"
            share_likelihood = "likely"
        elif overall >= 50:
            click_rate = "medium"
            share_likelihood = "possible"
        else:
            click_rate = "low"
            share_likelihood = "unlikely"

        # Read completion based on length and readability
        word_count = len(words)
        if word_count < 300:
            completion = 0.85
        elif word_count < 800:
            completion = 0.7
        elif word_count < 1500:
            completion = 0.55
        else:
            completion = 0.4
        # Adjust for readability
        completion = completion * (0.5 + readability["flesch_reading_ease"] / 200)

        # Strengths and improvements
        strengths = []
        improvements = []

        if headline_score >= 70:
            strengths.append("Strong, attention-grabbing headline")
        else:
            improvements.append("Improve headline with power words or numbers")

        if hook_score >= 70:
            strengths.append("Engaging opening that hooks readers")
        else:
            improvements.append("Make the opening more personal and engaging")

        if read_score >= 60:
            strengths.append("Good readability for target audience")
        else:
            improvements.append("Simplify language for better readability")

        if emotional_score >= 60:
            strengths.append("Strong emotional appeal")
        else:
            improvements.append("Add more emotional triggers")

        if cta_score >= 60:
            strengths.append("Clear call-to-action")
        else:
            improvements.append("Add or strengthen call-to-action")

        return {
            "overall_score": round(overall, 1),
            "headline_score": round(headline_score, 1),
            "hook_score": round(hook_score, 1),
            "readability_score": round(read_score, 1),
            "emotional_score": round(emotional_score, 1),
            "cta_score": round(cta_score, 1),
            "predicted_click_rate": click_rate,
            "predicted_read_completion": round(min(1.0, completion), 2),
            "predicted_share_likelihood": share_likelihood,
            "strengths": strengths,
            "improvements": improvements,
        }

    def full_analysis(
        self,
        text: str,
        target_keywords: Optional[List[str]] = None,
        content_type: str = "blog",
        platform: Optional[str] = None
    ) -> dict:
        """Run all analyses on the text."""
        return {
            "readability": self.analyze_readability(text),
            "sentiment": self.analyze_sentiment(text),
            "seo": self.analyze_seo(text, target_keywords, content_type),
            "engagement": self.predict_engagement(text, content_type, platform),
        }


# Singleton instance
_analyzer: Optional[TextAnalyzer] = None


def get_text_analyzer() -> TextAnalyzer:
    """Get or create the text analyzer instance."""
    global _analyzer
    if _analyzer is None:
        _analyzer = TextAnalyzer()
    return _analyzer
