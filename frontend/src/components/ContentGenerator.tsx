import { useState, useEffect } from 'react';
import {
  Brand,
  Persona,
  fetchBrands,
  fetchPersonas,
  generateLongFormOutline,
  generateLongFormStream,
  generateEmailSequenceStream,
  generateAdCampaignStream,
  generateSEOContentStream,
  generateLandingPageStream,
  generateVideoScriptStream,
  LongFormRequest,
  LongFormOutline,
  OutlineSection,
  EmailSequenceRequest,
  EmailType,
  AdCampaignRequest,
  AdPlatform,
  SEOContentRequest,
  LandingPageRequest,
  VideoScriptRequest,
  VideoType,
} from '../api/client';

type ContentTab = 'long-form' | 'email' | 'ads' | 'seo' | 'landing' | 'video';

const TABS: { id: ContentTab; label: string; icon: string }[] = [
  { id: 'long-form', label: 'Long-form', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'email', label: 'Email Sequences', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'ads', label: 'Ad Campaigns', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { id: 'seo', label: 'SEO Content', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'landing', label: 'Landing Pages', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { id: 'video', label: 'Video Scripts', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
];

const CONTENT_TYPES = [
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'article', label: 'Article' },
  { value: 'guide', label: 'Guide' },
  { value: 'tutorial', label: 'Tutorial' },
];

const EMAIL_TYPES: { value: EmailType; label: string }[] = [
  { value: 'welcome', label: 'Welcome Series' },
  { value: 'nurture', label: 'Nurture Sequence' },
  { value: 'sales', label: 'Sales Funnel' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'abandoned_cart', label: 'Abandoned Cart' },
];

const AD_PLATFORMS: { value: AdPlatform; label: string }[] = [
  { value: 'google', label: 'Google Ads' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'tiktok', label: 'TikTok' },
];

const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube_short', label: 'YouTube Shorts' },
  { value: 'instagram_reel', label: 'Instagram Reels' },
  { value: 'youtube_long', label: 'YouTube Long-form' },
  { value: 'explainer', label: 'Explainer Video' },
  { value: 'testimonial', label: 'Testimonial' },
];

const PAGE_TYPES = [
  { value: 'landing', label: 'Landing Page' },
  { value: 'blog', label: 'Blog' },
  { value: 'product', label: 'Product Page' },
  { value: 'service', label: 'Service Page' },
  { value: 'about', label: 'About Page' },
];

export function ContentGenerator() {
  const [activeTab, setActiveTab] = useState<ContentTab>('long-form');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>();
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | undefined>();
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Long-form state
  const [longFormTopic, setLongFormTopic] = useState('');
  const [longFormType, setLongFormType] = useState('blog_post');
  const [longFormAudience, setLongFormAudience] = useState('');
  const [longFormWordCount, setLongFormWordCount] = useState(1000);
  const [longFormTone, setLongFormTone] = useState('');
  const [longFormKeywords, setLongFormKeywords] = useState('');
  const [outline, setOutline] = useState<LongFormOutline | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  // Email state
  const [emailType, setEmailType] = useState<EmailType>('welcome');
  const [emailProduct, setEmailProduct] = useState('');
  const [emailAudience, setEmailAudience] = useState('');
  const [emailCount, setEmailCount] = useState(5);
  const [emailDaysBetween, setEmailDaysBetween] = useState(2);
  const [emailBenefits, setEmailBenefits] = useState('');
  const [emailCta, setEmailCta] = useState('');

  // Ads state
  const [adPlatform, setAdPlatform] = useState<AdPlatform>('facebook');
  const [adProduct, setAdProduct] = useState('');
  const [adAudience, setAdAudience] = useState('');
  const [adGoal, setAdGoal] = useState('conversions');
  const [adBenefits, setAdBenefits] = useState('');
  const [adOffer, setAdOffer] = useState('');
  const [adVariations, setAdVariations] = useState(3);

  // SEO state
  const [seoTopic, setSeoTopic] = useState('');
  const [seoUrl, setSeoUrl] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoPageType, setSeoPageType] = useState('landing');

  // Landing page state
  const [landingProduct, setLandingProduct] = useState('');
  const [landingAudience, setLandingAudience] = useState('');
  const [landingUvp, setLandingUvp] = useState('');
  const [landingFeatures, setLandingFeatures] = useState('');
  const [landingPainPoints, setLandingPainPoints] = useState('');
  const [landingTestimonials, setLandingTestimonials] = useState(3);
  const [landingFaqs, setLandingFaqs] = useState(5);

  // Video state
  const [videoType, setVideoType] = useState<VideoType>('tiktok');
  const [videoTopic, setVideoTopic] = useState('');
  const [videoAudience, setVideoAudience] = useState('');
  const [videoDuration, setVideoDuration] = useState(60);
  const [videoMessage, setVideoMessage] = useState('');
  const [videoCta, setVideoCta] = useState('');

  useEffect(() => {
    loadBrandsAndPersonas();
  }, []);

  const loadBrandsAndPersonas = async () => {
    try {
      const [brandsData, personasData] = await Promise.all([
        fetchBrands(),
        fetchPersonas(),
      ]);
      setBrands(brandsData);
      setPersonas(personasData);
      const defaultBrand = brandsData.find(b => b.is_default);
      if (defaultBrand) setSelectedBrandId(defaultBrand.id);
    } catch (err) {
      console.error('Failed to load brands/personas:', err);
    }
  };

  const handleGenerateOutline = async () => {
    if (!longFormTopic) return;
    setIsGeneratingOutline(true);
    setError(null);
    try {
      const request: LongFormRequest = {
        topic: longFormTopic,
        content_type: longFormType,
        target_audience: longFormAudience || undefined,
        word_count: longFormWordCount,
        tone: longFormTone || undefined,
        keywords: longFormKeywords ? longFormKeywords.split(',').map(k => k.trim()) : undefined,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
      };
      const result = await generateLongFormOutline(request);
      setOutline(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate outline');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateLongForm = async () => {
    if (!longFormTopic) return;
    setIsGenerating(true);
    setOutput('');
    setError(null);
    try {
      const request: LongFormRequest = {
        topic: longFormTopic,
        content_type: longFormType,
        target_audience: longFormAudience || undefined,
        word_count: longFormWordCount,
        tone: longFormTone || undefined,
        keywords: longFormKeywords ? longFormKeywords.split(',').map(k => k.trim()) : undefined,
        outline: outline?.sections,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
      };
      for await (const chunk of generateLongFormStream(request)) {
        if (chunk.chunk) setOutput(prev => prev + chunk.chunk);
        if (chunk.error) setError(chunk.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEmails = async () => {
    if (!emailProduct) return;
    setIsGenerating(true);
    setOutput('');
    setError(null);
    try {
      const request: EmailSequenceRequest = {
        sequence_type: emailType,
        product_or_service: emailProduct,
        target_audience: emailAudience || undefined,
        email_count: emailCount,
        days_between: emailDaysBetween,
        key_benefits: emailBenefits ? emailBenefits.split(',').map(b => b.trim()) : undefined,
        call_to_action: emailCta || undefined,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
      };
      for await (const chunk of generateEmailSequenceStream(request)) {
        if (chunk.chunk) setOutput(prev => prev + chunk.chunk);
        if (chunk.error) setError(chunk.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate emails');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAds = async () => {
    if (!adProduct) return;
    setIsGenerating(true);
    setOutput('');
    setError(null);
    try {
      const request: AdCampaignRequest = {
        platform: adPlatform,
        product_or_service: adProduct,
        target_audience: adAudience || undefined,
        campaign_goal: adGoal,
        key_benefits: adBenefits ? adBenefits.split(',').map(b => b.trim()) : undefined,
        offer: adOffer || undefined,
        variations: adVariations,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
      };
      for await (const chunk of generateAdCampaignStream(request)) {
        if (chunk.chunk) setOutput(prev => prev + chunk.chunk);
        if (chunk.error) setError(chunk.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate ads');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSEO = async () => {
    if (!seoTopic || !seoKeywords) return;
    setIsGenerating(true);
    setOutput('');
    setError(null);
    try {
      const request: SEOContentRequest = {
        page_topic: seoTopic,
        page_url: seoUrl || undefined,
        target_keywords: seoKeywords.split(',').map(k => k.trim()),
        page_type: seoPageType,
        brand_id: selectedBrandId,
      };
      for await (const chunk of generateSEOContentStream(request)) {
        if (chunk.chunk) setOutput(prev => prev + chunk.chunk);
        if (chunk.error) setError(chunk.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SEO content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateLandingPage = async () => {
    if (!landingProduct) return;
    setIsGenerating(true);
    setOutput('');
    setError(null);
    try {
      const request: LandingPageRequest = {
        product_or_service: landingProduct,
        target_audience: landingAudience || undefined,
        unique_value_proposition: landingUvp || undefined,
        key_features: landingFeatures ? landingFeatures.split(',').map(f => f.trim()) : undefined,
        pain_points: landingPainPoints ? landingPainPoints.split(',').map(p => p.trim()) : undefined,
        testimonials_count: landingTestimonials,
        faq_count: landingFaqs,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
      };
      for await (const chunk of generateLandingPageStream(request)) {
        if (chunk.chunk) setOutput(prev => prev + chunk.chunk);
        if (chunk.error) setError(chunk.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate landing page');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideoScript = async () => {
    if (!videoTopic) return;
    setIsGenerating(true);
    setOutput('');
    setError(null);
    try {
      const request: VideoScriptRequest = {
        video_type: videoType,
        topic: videoTopic,
        target_audience: videoAudience || undefined,
        duration_seconds: videoDuration,
        key_message: videoMessage || undefined,
        call_to_action: videoCta || undefined,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
      };
      for await (const chunk of generateVideoScriptStream(request)) {
        if (chunk.chunk) setOutput(prev => prev + chunk.chunk);
        if (chunk.error) setError(chunk.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video script');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
  };

  const renderBrandPersonaSelectors = () => (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
        <select
          value={selectedBrandId || ''}
          onChange={e => setSelectedBrandId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">No brand</option>
          {brands.map(brand => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Persona</label>
        <select
          value={selectedPersonaId || ''}
          onChange={e => setSelectedPersonaId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">No persona</option>
          {personas.map(persona => (
            <option key={persona.id} value={persona.id}>{persona.name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderLongFormTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic *</label>
        <input
          type="text"
          value={longFormTopic}
          onChange={e => setLongFormTopic(e.target.value)}
          placeholder="e.g., The Ultimate Guide to Remote Work Productivity"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type</label>
          <select
            value={longFormType}
            onChange={e => setLongFormType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {CONTENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Word Count</label>
          <input
            type="number"
            min={300}
            max={5000}
            value={longFormWordCount}
            onChange={e => setLongFormWordCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
        <input
          type="text"
          value={longFormAudience}
          onChange={e => setLongFormAudience(e.target.value)}
          placeholder="e.g., Remote workers and digital nomads"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keywords (comma-separated)</label>
        <input
          type="text"
          value={longFormKeywords}
          onChange={e => setLongFormKeywords(e.target.value)}
          placeholder="e.g., remote work, productivity, work from home"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      {renderBrandPersonaSelectors()}

      {outline && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Generated Outline</h4>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{outline.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{outline.introduction}</p>
          <ul className="mt-3 space-y-2">
            {outline.sections.map((section, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-gray-900 dark:text-white">{i + 1}. {section.title}</span>
                <ul className="ml-4 mt-1 text-gray-600 dark:text-gray-400">
                  {section.key_points.map((point, j) => (
                    <li key={j}>- {point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleGenerateOutline}
          disabled={!longFormTopic || isGeneratingOutline}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingOutline ? 'Generating...' : 'Generate Outline'}
        </button>
        <button
          onClick={handleGenerateLongForm}
          disabled={!longFormTopic || isGenerating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate Content'}
        </button>
      </div>
    </div>
  );

  const renderEmailTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sequence Type</label>
          <select
            value={emailType}
            onChange={e => setEmailType(e.target.value as EmailType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {EMAIL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Emails</label>
          <input
            type="number"
            min={2}
            max={10}
            value={emailCount}
            onChange={e => setEmailCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product/Service *</label>
        <input
          type="text"
          value={emailProduct}
          onChange={e => setEmailProduct(e.target.value)}
          placeholder="e.g., SaaS productivity tool for remote teams"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
        <input
          type="text"
          value={emailAudience}
          onChange={e => setEmailAudience(e.target.value)}
          placeholder="e.g., Small business owners"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Days Between Emails</label>
          <input
            type="number"
            min={1}
            max={14}
            value={emailDaysBetween}
            onChange={e => setEmailDaysBetween(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Call-to-Action</label>
          <input
            type="text"
            value={emailCta}
            onChange={e => setEmailCta(e.target.value)}
            placeholder="e.g., Start free trial"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Benefits (comma-separated)</label>
        <input
          type="text"
          value={emailBenefits}
          onChange={e => setEmailBenefits(e.target.value)}
          placeholder="e.g., Save time, Increase productivity, Team collaboration"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      {renderBrandPersonaSelectors()}
      <button
        onClick={handleGenerateEmails}
        disabled={!emailProduct || isGenerating}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating...' : 'Generate Email Sequence'}
      </button>
    </div>
  );

  const renderAdsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
          <select
            value={adPlatform}
            onChange={e => setAdPlatform(e.target.value as AdPlatform)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {AD_PLATFORMS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variations</label>
          <input
            type="number"
            min={1}
            max={5}
            value={adVariations}
            onChange={e => setAdVariations(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product/Service *</label>
        <input
          type="text"
          value={adProduct}
          onChange={e => setAdProduct(e.target.value)}
          placeholder="e.g., Online fitness coaching program"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
          <input
            type="text"
            value={adAudience}
            onChange={e => setAdAudience(e.target.value)}
            placeholder="e.g., Busy professionals aged 25-45"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Goal</label>
          <select
            value={adGoal}
            onChange={e => setAdGoal(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="conversions">Conversions</option>
            <option value="awareness">Brand Awareness</option>
            <option value="traffic">Website Traffic</option>
            <option value="engagement">Engagement</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Benefits (comma-separated)</label>
        <input
          type="text"
          value={adBenefits}
          onChange={e => setAdBenefits(e.target.value)}
          placeholder="e.g., Lose weight, Build muscle, Feel confident"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Offer</label>
        <input
          type="text"
          value={adOffer}
          onChange={e => setAdOffer(e.target.value)}
          placeholder="e.g., 50% off first month"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      {renderBrandPersonaSelectors()}
      <button
        onClick={handleGenerateAds}
        disabled={!adProduct || isGenerating}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating...' : 'Generate Ad Campaign'}
      </button>
    </div>
  );

  const renderSEOTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page Topic *</label>
        <input
          type="text"
          value={seoTopic}
          onChange={e => setSeoTopic(e.target.value)}
          placeholder="e.g., Best project management software for startups"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page Type</label>
          <select
            value={seoPageType}
            onChange={e => setSeoPageType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {PAGE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page URL (optional)</label>
          <input
            type="text"
            value={seoUrl}
            onChange={e => setSeoUrl(e.target.value)}
            placeholder="e.g., /best-project-management-software"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Keywords * (comma-separated)</label>
        <input
          type="text"
          value={seoKeywords}
          onChange={e => setSeoKeywords(e.target.value)}
          placeholder="e.g., project management software, startup tools, team collaboration"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
          <select
            value={selectedBrandId || ''}
            onChange={e => setSelectedBrandId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">No brand</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>
        <div></div>
      </div>
      <button
        onClick={handleGenerateSEO}
        disabled={!seoTopic || !seoKeywords || isGenerating}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating...' : 'Generate SEO Content'}
      </button>
    </div>
  );

  const renderLandingTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product/Service *</label>
        <input
          type="text"
          value={landingProduct}
          onChange={e => setLandingProduct(e.target.value)}
          placeholder="e.g., AI-powered writing assistant"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
        <input
          type="text"
          value={landingAudience}
          onChange={e => setLandingAudience(e.target.value)}
          placeholder="e.g., Content creators and marketers"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unique Value Proposition</label>
        <input
          type="text"
          value={landingUvp}
          onChange={e => setLandingUvp(e.target.value)}
          placeholder="e.g., Write 10x faster with AI that understands your brand"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Features (comma-separated)</label>
        <input
          type="text"
          value={landingFeatures}
          onChange={e => setLandingFeatures(e.target.value)}
          placeholder="e.g., Brand voice training, Multi-language support, SEO optimization"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pain Points (comma-separated)</label>
        <input
          type="text"
          value={landingPainPoints}
          onChange={e => setLandingPainPoints(e.target.value)}
          placeholder="e.g., Writer's block, Time-consuming content creation, Inconsistent brand voice"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Testimonials Count</label>
          <input
            type="number"
            min={0}
            max={5}
            value={landingTestimonials}
            onChange={e => setLandingTestimonials(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">FAQ Count</label>
          <input
            type="number"
            min={0}
            max={10}
            value={landingFaqs}
            onChange={e => setLandingFaqs(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      {renderBrandPersonaSelectors()}
      <button
        onClick={handleGenerateLandingPage}
        disabled={!landingProduct || isGenerating}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating...' : 'Generate Landing Page Copy'}
      </button>
    </div>
  );

  const renderVideoTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video Type</label>
          <select
            value={videoType}
            onChange={e => setVideoType(e.target.value as VideoType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {VIDEO_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (seconds)</label>
          <input
            type="number"
            min={15}
            max={600}
            value={videoDuration}
            onChange={e => setVideoDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic *</label>
        <input
          type="text"
          value={videoTopic}
          onChange={e => setVideoTopic(e.target.value)}
          placeholder="e.g., 5 productivity hacks for remote workers"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
        <input
          type="text"
          value={videoAudience}
          onChange={e => setVideoAudience(e.target.value)}
          placeholder="e.g., Remote workers and freelancers"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Message</label>
        <input
          type="text"
          value={videoMessage}
          onChange={e => setVideoMessage(e.target.value)}
          placeholder="e.g., Small changes lead to big productivity gains"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Call-to-Action</label>
        <input
          type="text"
          value={videoCta}
          onChange={e => setVideoCta(e.target.value)}
          placeholder="e.g., Follow for more tips"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      {renderBrandPersonaSelectors()}
      <button
        onClick={handleGenerateVideoScript}
        disabled={!videoTopic || isGenerating}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating...' : 'Generate Video Script'}
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Multi-Format Content Generator</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {TABS.find(t => t.id === activeTab)?.label} Generator
          </h2>

          {activeTab === 'long-form' && renderLongFormTab()}
          {activeTab === 'email' && renderEmailTab()}
          {activeTab === 'ads' && renderAdsTab()}
          {activeTab === 'seo' && renderSEOTab()}
          {activeTab === 'landing' && renderLandingTab()}
          {activeTab === 'video' && renderVideoTab()}
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generated Content</h2>
            {output && (
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Copy
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isGenerating && !output && (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          )}

          {output ? (
            <div className="prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans">
                {output}
              </pre>
            </div>
          ) : !isGenerating && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">
              Fill in the form and click Generate to create content
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
