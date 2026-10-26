import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Clock3, CloudRain, Heart, MapPin, Music2, PartyPopper, Phone, Sparkles, VolumeX
} from 'lucide-react';

const CONFIG = {
  graduateName: 'Tên của bạn',
  school: 'Tên trường đại học',
  graduationDate: 'Ngày tốt nghiệp sẽ được cập nhật',
  eventTime: 'Giờ bắt đầu sẽ được cập nhật',
  venue: 'Địa điểm tổ chức sẽ được cập nhật',
  address: 'Địa chỉ cụ thể sẽ được cập nhật',
  mapsUrl: '',
  expiresAt: import.meta.env.VITE_INVITATION_EXPIRES_AT || '',
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
let supabase = null;
let supabaseConfigurationError = '';

if (!supabaseUrl || !supabaseKey) {
  supabaseConfigurationError = 'Thiếu cấu hình Supabase. Hãy cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY rồi tải lại trang.';
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch {
    console.error('Supabase client initialization failed.');
    supabaseConfigurationError = 'Cấu hình Supabase không hợp lệ. Hãy kiểm tra URL và anon key trong môi trường triển khai.';
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getInvitationToken() {
  return (new URLSearchParams(window.location.search).get('token') || '').trim();
}

function assertSuccessfulRsvpResult(data, response) {
  let result = data;

  if (Array.isArray(result)) {
    if (result.length !== 1 || !result[0] || typeof result[0] !== 'object') {
      throw new Error('submit_rsvp returned an unexpected row count or result.');
    }
    [result] = result;
  }

  if (result === null || result === true) return;
  if (!result || typeof result !== 'object') {
    throw new Error('submit_rsvp returned an unexpected result.');
  }

  const successIndicator = result.success ?? result.ok ?? result.submit_rsvp;
  const failedStatus = typeof result.status === 'string' &&
    /^(error|failed|failure)$/i.test(result.status);
  const mismatchedResponse = 'response' in result && result.response !== response;

  if (successIndicator === false || failedStatus || mismatchedResponse) {
    throw new Error('submit_rsvp returned an unsuccessful result.');
  }
}

function getRandomLetterStickers() {
  const stickers = [1, 2, 3, 4, 5];
  for (let index = stickers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [stickers[index], stickers[swapIndex]] = [stickers[swapIndex], stickers[index]];
  }
  return stickers.slice(0, 3);
}

function Confetti() {
  return <div className="confetti" aria-hidden="true">
    <span className="celebration-burst" />
    {Array.from({ length: 44 }, (_, i) => <i key={i} style={{
      left: `${(i * 37) % 100}%`,
      animationDelay: `${(i % 8) * 0.09}s`,
      animationDuration: `${2.6 + (i % 5) * 0.22}s`,
      '--drift': `${((i * 29) % 150) - 75}px`,
      '--spin': `${540 + (i % 5) * 180}deg`,
    }} />)}
  </div>;
}

export default function App() {
  const invitationToken = useMemo(getInvitationToken, []);
  const [invitation, setInvitation] = useState({ status: 'loading', guest: null });
  const [letterStickers] = useState(getRandomLetterStickers);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingResponse, setPendingResponse] = useState('');
  const [musicOn, setMusicOn] = useState(true);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [expired, setExpired] = useState(false);
  const [slide, setSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [sadReaction, setSadReaction] = useState(false);
  const [reactionKey, setReactionKey] = useState(0);
  const [activityVersion, setActivityVersion] = useState(0);
  const timerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const sadReactionTimerRef = useRef(null);
  const transitionLockRef = useRef(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const audioRef = useRef(null);

  useEffect(() => {
    const handleUserActivity = () => {
      setActivityVersion(version => version + 1);
    };
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'wheel'];

    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleUserActivity);
      });
    };
  }, []);

  useEffect(() => {
    if (celebrating || response || busy || isTransitioning || slide >= 4) {
      return;
    }

    timerRef.current = setTimeout(() => {
      if (transitionLockRef.current || busyRef.current) return;
      transitionLockRef.current = true;
      setIsTransitioning(true);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      transitionTimerRef.current = setTimeout(() => {
        setSlide(current => Math.min(current + 1, 4));
        setIsTransitioning(false);
        transitionLockRef.current = false;
      }, reducedMotion ? 0 : 360);
    }, 5000);

    return () => clearTimeout(timerRef.current);
  }, [activityVersion, celebrating, response, busy, isTransitioning, slide]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(transitionTimerRef.current);
      clearTimeout(celebrationTimerRef.current);
      clearTimeout(sadReactionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function changeSlide(target) {
    if (transitionLockRef.current || busyRef.current || target === slide) return;
    transitionLockRef.current = true;
    setIsTransitioning(true);
    clearTimeout(timerRef.current);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    transitionTimerRef.current = setTimeout(() => {
      setSlide(Math.max(0, Math.min(target, 4)));
      setIsTransitioning(false);
      transitionLockRef.current = false;
    }, reducedMotion ? 0 : 360);
  }

  async function playCelebrationAudio() {
    try {
      const asset = await fetch('/sounds/cheer.mp3', { method: 'HEAD' });
      if (!mountedRef.current) return;
      if (!asset.ok || asset.headers.get('content-length') === '0') {
        if (mountedRef.current) setAudioUnavailable(true);
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/cheer.mp3');
        audioRef.current.preload = 'none';
        audioRef.current.volume = 0.55;
      }
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch {
      if (mountedRef.current) setAudioUnavailable(true);
    }
  }

  useEffect(() => {
    if (CONFIG.expiresAt) setExpired(Date.now() > new Date(CONFIG.expiresAt).getTime());
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInvitation() {
      if (!invitationToken) {
        setInvitation({ status: 'missing-token', guest: null });
        return;
      }

      if (!UUID_PATTERN.test(invitationToken)) {
        setInvitation({ status: 'invalid-token', guest: null });
        return;
      }

      if (!supabase) {
        setInvitation({
          status: 'error',
          guest: null,
          message: supabaseConfigurationError,
        });
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_invitation', {
          p_token: invitationToken,
        });
        if (error) throw error;

        if (!Array.isArray(data)) {
          throw new Error('get_invitation returned an unexpected response.');
        }
        if (data.length === 0) {
          if (active) setInvitation({ status: 'not-found', guest: null });
          return;
        }
        if (data.length !== 1) {
          throw new Error('get_invitation returned more than one guest.');
        }

        const guest = data[0];
        if (
          !guest ||
          typeof guest.guest_id !== 'string' ||
          !guest.guest_id.trim() ||
          typeof guest.guest_name !== 'string' ||
          !guest.guest_name.trim() ||
          typeof guest.letter_message !== 'string'
        ) {
          throw new Error('get_invitation returned invalid guest fields.');
        }

        if (active) setInvitation({ status: 'loaded', guest });
      } catch (error) {
        console.error('Failed to load personalized invitation:', error);
        if (active) {
          setInvitation({
            status: 'error',
            guest: null,
            message: 'Không tải được thư mời riêng. Kiểm tra kết nối rồi thử tải lại trang.',
          });
        }
      }
    }

    loadInvitation();
    return () => {
      active = false;
    };
  }, [invitationToken]);

  async function chooseResponse(value) {
    if (
      busyRef.current ||
      invitation.status !== 'loaded' ||
      !supabase ||
      !UUID_PATTERN.test(invitationToken)
    ) return;

    busyRef.current = true;
    setBusy(true);
    setPendingResponse(value);
    setStatus('Đang gửi phản hồi...');

    try {
      const { data, error } = await supabase.rpc('submit_rsvp', {
        p_token: invitationToken,
        p_response: value,
      });
      if (error) throw error;
      assertSuccessfulRsvpResult(data, value);

      setResponse(value);
      setStatus('Phản hồi của bạn đã được ghi nhận.');
      setReactionKey(key => key + 1);
      clearTimeout(sadReactionTimerRef.current);
      if (value === 'yes') {
        setSadReaction(false);
        setCelebrating(true);
        clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = setTimeout(() => setCelebrating(false), 4200);
        if (musicOn) playCelebrationAudio();
      } else {
        setCelebrating(false);
        setSadReaction(true);
        sadReactionTimerRef.current = setTimeout(() => setSadReaction(false), 3800);
        clearTimeout(celebrationTimerRef.current);
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
      }
    } catch (error) {
      console.error('Failed to submit RSVP:', error);
      setStatus('Chưa gửi được phản hồi. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      busyRef.current = false;
      setBusy(false);
      setPendingResponse('');
    }
  }

  const invitationStatusMessage = {
    loading: 'Đang tải thư mời riêng...',
    'missing-token': 'Link này chưa có token khách mời. Hãy mở link cá nhân được gửi cho bạn.',
    'invalid-token': 'Token trong link không đúng định dạng. Vui lòng kiểm tra lại link mời.',
    'not-found': 'Không tìm thấy thư mời cho token này. Vui lòng liên hệ người gửi để xác nhận link.',
  }[invitation.status] || invitation.message;

  if (expired) return <main className="expired-page">
    <article className="paper expired-card">
      <span className="eyebrow">A LITTLE NOTE</span>
      <h1>Buổi hẹn đã khép lại <Heart size={25} fill="currentColor" /></h1>
      <p>Cảm ơn bạn đã ghé thăm tấm thiệp tốt nghiệp này. Hẹn gặp bạn ở những kỷ niệm tiếp theo nhé!</p>
    </article>
  </main>;

  return <main className={`page-shell ${slide === 0 ? 'is-cover-active' : ''} ${celebrating ? 'is-celebrating' : ''}`}>
    {celebrating && <Confetti key={reactionKey} />}
    <div className={`paper ${slide === 0 ? 'cover-paper' : ''}`}>
      <div className="torn torn-top" aria-hidden="true" />
      <div className="torn torn-bottom" aria-hidden="true" />
      <div className="star-cluster star-top"><Sparkles /><span>✦</span><span>✦</span></div>
      <div className="star-sticker star-right">★</div>
      <div className="star-sticker star-left">★</div>

      <header className="topline">
        <span>CLASS OF 20XX</span>
        <button className="music-toggle" onClick={() => setMusicOn(v => !v)} aria-label={musicOn ? 'Tắt âm thanh ăn mừng' : 'Bật âm thanh ăn mừng'}>
          {musicOn ? <Music2 size={16} /> : <VolumeX size={16} />}
          <span>{musicOn ? 'Âm thanh bật' : 'Âm thanh tắt'}</span>
        </button>
      </header>

      <div className="slide-progress">
        {[0, 1, 2, 3, 4].map(n => (
          <span
            key={n}
            className={n <= slide ? 'active' : ''}
          />
        ))}
      </div>


      <div className="slides-viewport">
        <section key={slide} className={`slide-content slide-enter ${isTransitioning ? 'is-exiting' : ''}`}>

            {slide === 0 && (
              <div className="cover-slide">
                <div className="cover-art">
                  <img
                    className="cover-image"
                    src="/images/graduation-cover.png"
                    alt="Poster lễ tốt nghiệp"
                  />
                  <button className="cover-open-button" onClick={() => changeSlide(1)}>
                    Mở thiệp của bạn
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            )}

            {slide === 1 && (
              <div className="invitation-slide handwritten-letter">
                {invitation.status === 'loaded' ? (
                  <>
                    <p className="letter-greeting">{invitation.guest.guest_name},</p>
                    <p className="letter-message">{invitation.guest.letter_message}</p>
                  </>
                ) : (
                  <p className="invitation-status" role="status" aria-live="polite">
                    {invitationStatusMessage}
                  </p>
                )}
                <img
                  className="letter-sticker letter-sticker-top-right"
                  src={`/images/letter-sticker-${letterStickers[0]}.png`}
                  alt=""
                  aria-hidden="true"
                />
                <img
                  className="letter-sticker letter-sticker-bottom-left"
                  src={`/images/letter-sticker-${letterStickers[1]}.png`}
                  alt=""
                  aria-hidden="true"
                />
                <img
                  className="letter-sticker letter-sticker-bottom-right"
                  src={`/images/letter-sticker-${letterStickers[2]}.png`}
                  alt=""
                  aria-hidden="true"
                />
              </div>
            )}

            {slide === 2 && (
              <div className="event-slide">
                <h2>Hẹn gặp bạn<br /><em>ngày hôm ấy</em></h2>

                <div className="event-info">
                  <div className="event-info-columns">
                    <div className="event-info-item">
                      <Clock3 aria-hidden="true" />
                      <p>15:30 – 17:30<br />31/10/2026</p>
                    </div>
                    <div className="event-info-divider" aria-hidden="true" />
                    <div className="event-info-item">
                      <MapPin aria-hidden="true" />
                      <p>Hội trường Rùa – Khu II,<br />Đại học Cần Thơ</p>
                    </div>
                  </div>
                </div>
                <div className="event-bottom-row">
                  <a className="event-phone" href="tel:0394024287">
                    <Phone aria-hidden="true" />
                    <span>039 4024 287</span>
                  </a>
                  <img
                    className="save-date-sticker"
                    src="/images/save-date-character.png"
                    alt=""
                    aria-hidden="true"
                  />
                </div>
              </div>
            )}

            {slide === 3 && (
              <div className="rsvp-slide">
                <h2 className="rsvp-title">Bạn có mặt chứ?</h2>
                {response && (
                  <div key={reactionKey} className={`response-card ${response === 'yes' ? 'response-yes' : 'response-no'} ${response === 'yes' && celebrating ? 'is-celebrated' : ''} ${response === 'no' && sadReaction ? 'is-regretted' : ''}`}>
                    {response === 'no' && sadReaction && (
                      <div className="sad-rain" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                    <div className="response-medallion" aria-hidden="true">
                      {response === 'yes' ? <PartyPopper size={25} /> : <CloudRain size={24} />}
                    </div>
                    <p className="response-kicker">
                      {response === 'yes' ? 'TIN VUI RỒI!' : 'HẸN DỊP KHÁC NHÉ'}
                    </p>
                    <h2>
                      {response === 'yes'
                        ? 'YEAHHH! Hẹn gặp bạn nhé!'
                        : 'Ôi tiếc quá!'}
                    </h2>
                    <p>
                      {response === 'yes'
                        ? 'Chuẩn bị outfit thật xinh để cùng nhau lưu giữ kỷ niệm nha!'
                        : 'Hết kèo này ta bày kèo khác! Hẹn dịp gần nhất nhé.'}
                    </p>
                  </div>
                )}
                <div className="rsvp-section">
                  {response && <p className="rsvp-change-prompt">Bạn có thể thay đổi lựa chọn bên dưới.</p>}
                  <button
                    className="primary-button"
                    disabled={busy || invitation.status !== 'loaded'}
                    onClick={() => chooseResponse('yes')}
                  >
                    {busy && pendingResponse === 'yes' ? 'Đang gửi...' : '🎉 Có chứ, hẹn gặp nhé!'}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busy || invitation.status !== 'loaded'}
                    onClick={() => chooseResponse('no')}
                  >
                    {busy && pendingResponse === 'no' ? 'Đang gửi...' : '♡ Tiếc quá, mình bận mất rồi'}
                  </button>
                </div>
                {status && <p className="status-message">{status}</p>}
                {response === 'yes' && audioUnavailable && (
                  <p className="status-message sound-status">
                    Âm thanh reo hò chưa khả dụng. Hãy thêm tệp MP3 hợp lệ tại public/sounds/cheer.mp3.
                  </p>
                )}
              </div>
            )}

            {slide === 4 && (
              <div className="thankyou-slide">
                <h2 className="thankyou-title">
                  <span>Cảm ơn</span>
                  <em>đã là thanh xuân</em>
                </h2>
                <p className="invitation-message thankyou-message">
                  Cảm ơn bạn đã đồng hành, sẻ chia và góp mặt
                  trong những ký ức đẹp của mình.
                </p>
              </div>
            )}

        </section>
      </div>

        {slide > 0 && (
          <div className="slide-controls">
            <button
              className="text-button"
              disabled={isTransitioning || slide === 0 || busy}
              onClick={() => changeSlide(slide - 1)}
            >
              ← Trước
            </button>

            <span>{slide + 1} / 5</span>

            <button
              className="text-button"
              disabled={isTransitioning || slide === 4 || busy}
              onClick={() => changeSlide(slide + 1)}
            >
              Tiếp →
            </button>
          </div>
        )}

    </div>
    <p className="page-hint">Một tấm thiệp nhỏ, lưu giữ một ngày thật lớn.</p>
  </main>;
}
