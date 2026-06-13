/**
 * Silentium — 内置内容库
 * 文本 + 来源链接，用户自行下载音频导入
 */

import { createMaterial } from './data-structure.js';
import { upsertMaterial } from './storage.js';
import { sanitizeHTML, showToast } from './utils.js';

const LIBRARY = [
  // ==================== BBC 6 Minute English ====================
  {
    title: 'BBC 6ME — AI in the Workplace',
    category: 'tech',
    difficulty: 'intermediate',
    sourceUrl: 'https://www.bbc.co.uk/learningenglish/features/6-minute-english',
    originalText: `Artificial intelligence is changing the way we work. From automating routine tasks to helping us make better decisions, AI tools are becoming part of our daily professional lives. But how exactly is AI affecting the workplace?

Some experts believe AI will eliminate millions of jobs, particularly those involving repetitive tasks. Factory workers, data entry clerks, and even some legal professionals could see their roles automated in the coming years. This creates anxiety for many workers who worry about their future.

However, other researchers argue that AI will create new types of jobs rather than simply destroying old ones. Just as the internet created roles like social media manager and app developer, AI might create positions we cannot yet imagine. The key, they say, is education and adaptation.

Many companies are already using AI to assist human workers rather than replace them. Doctors use AI to help diagnose diseases more accurately. Teachers use AI to personalize learning for each student. Architects use AI to design more efficient buildings. In each case, the technology enhances human abilities rather than making humans unnecessary.

The challenge for governments and businesses is to manage this transition fairly. Workers need opportunities to learn new skills. Companies need to think carefully about how they implement AI. And society as a whole needs to discuss what kind of future we want to build.`,
  },
  {
    title: 'BBC 6ME — Climate Anxiety',
    category: 'science',
    difficulty: 'intermediate',
    sourceUrl: 'https://www.bbc.co.uk/learningenglish/features/6-minute-english',
    originalText: `Have you ever felt worried about the future of our planet? If so, you are not alone. A growing number of people, especially young people, are experiencing what psychologists call climate anxiety.

Climate anxiety describes feelings of fear, sadness, and helplessness about climate change. Surveys suggest that more than half of young people around the world are very worried about climate change. Many say these feelings affect their daily lives, their decisions about having children, and their hopes for the future.

Psychologists say that climate anxiety is not a mental illness. It is a natural and rational response to a real threat. The problem is not that people are worried. The problem is when worry becomes so overwhelming that it stops people from taking action.

Experts recommend several strategies for coping with climate anxiety. One is to take action, however small. Joining a community garden, reducing your carbon footprint, or supporting environmental organizations can help you feel more in control. Another strategy is to connect with others who share your concerns. Talking about your feelings can reduce the sense of isolation.

Perhaps most importantly, therapists encourage people to find a balance between staying informed and protecting their mental health. Taking breaks from the news, spending time in nature, and focusing on what you can change rather than what you cannot are all helpful approaches.`,
  },
  {
    title: 'BBC 6ME — Food and Your Mood',
    category: 'science',
    difficulty: 'intermediate',
    sourceUrl: 'https://www.bbc.co.uk/learningenglish/features/6-minute-english',
    originalText: `We all know that food affects our physical health. But scientists are increasingly discovering that what we eat also has a powerful effect on our mental health. The connection between food and mood is stronger than many people realize.

Research has shown that a diet rich in fruits, vegetables, whole grains, and fish is associated with lower rates of depression. This is sometimes called the Mediterranean diet, after the traditional eating patterns of countries like Greece and Italy. People who follow this diet tend to have better mental health outcomes than those who eat a lot of processed foods.

Scientists believe the gut may be the key to understanding this connection. The human gut contains trillions of bacteria, known as the microbiome. These bacteria produce chemicals that affect our brain, including serotonin, which regulates mood. When we eat healthy foods, we feed the good bacteria, which in turn helps our brain function better.

On the other hand, a diet high in sugar, processed foods, and unhealthy fats can harm the microbiome. This may contribute to inflammation in the body, which has been linked to depression and anxiety. Some researchers now describe the gut as a second brain.

The good news is that even small changes to your diet can make a difference. Adding more vegetables to your meals, reducing sugar, and eating fermented foods like yogurt can all help. As one researcher put it, good food is not just fuel for the body. It is also fuel for the mind.`,
  },
  {
    title: 'BBC 6ME — The Art of Small Talk',
    category: 'culture',
    difficulty: 'intermediate',
    sourceUrl: 'https://www.bbc.co.uk/learningenglish/features/6-minute-english',
    originalText: `Small talk is the casual conversation we have with people we do not know well. It might seem unimportant, but small talk actually serves a vital social function. It helps us build connections, establish trust, and navigate social situations.

For many people, small talk can feel awkward or difficult. What should you talk about? How do you start a conversation with a stranger? The British, in particular, are famous for using the weather as a safe topic. But there are many other ways to begin a conversation.

Experts suggest a few simple techniques for better small talk. First, ask open questions. Instead of asking "Do you like your job?", try "What do you enjoy most about your work?" Open questions invite longer answers and show genuine interest. Second, listen actively. Pay attention to what the other person says and ask follow-up questions. Third, share something about yourself. Conversation is a two-way exchange, not an interview.

Research shows that people consistently underestimate how much strangers enjoy talking to them. In experiments, participants who were asked to talk to strangers on their commute reported feeling happier afterward. The strangers, too, enjoyed the conversation more than expected.

In a world where we increasingly communicate through screens, the value of face-to-face small talk may be greater than ever. It reminds us that we are all human, all navigating the same social world. So the next time you find yourself next to a stranger, try starting a conversation. You might be surprised by how rewarding it can be.`,
  },
  {
    title: 'BBC 6ME — Why Do We Forget?',
    category: 'science',
    difficulty: 'intermediate',
    sourceUrl: 'https://www.bbc.co.uk/learningenglish/features/6-minute-english',
    originalText: `Have you ever walked into a room and forgotten why you went there? Or met someone whose name you immediately forgot? You are not alone. Forgetting is a universal human experience. But why do we forget?

Scientists have identified several reasons for forgetting. One is simply the passage of time. The longer it has been since you learned something, the more likely you are to forget it. This is known as decay theory. Another reason is interference. New information can interfere with your ability to remember old information, and vice versa.

Lack of sleep is another major factor in forgetfulness. During sleep, our brains consolidate memories, moving information from short-term to long-term storage. If you do not get enough sleep, this process is disrupted. Stress, too, can impair memory. When you are stressed, your body produces hormones that affect the parts of the brain responsible for memory.

Interestingly, forgetting is not always a bad thing. Some researchers argue that forgetting is actually a useful function of the brain. If we remembered every detail of every day, our brains would be overwhelmed. Forgetting allows us to focus on what is truly important and discard the rest.

There are techniques that can help improve memory. Repetition and practice are the most basic methods. Making information meaningful by connecting it to things you already know also helps. And techniques like the method of loci, where you imagine placing information in familiar locations, have been used since ancient times. So while we all forget sometimes, we can also learn to remember better.`,
  },
  {
    title: 'BBC 6ME — Smartphone Addiction',
    category: 'tech',
    difficulty: 'intermediate',
    sourceUrl: 'https://www.bbc.co.uk/learningenglish/features/6-minute-english',
    originalText: `How many times a day do you check your phone? Twenty times? Fifty times? A hundred times? Research suggests that the average person checks their smartphone more than eighty times a day. Many of us have a complicated relationship with our devices.

Smartphone addiction is not currently recognized as an official medical diagnosis, but many researchers believe it shares features with other behavioral addictions. The constant notifications, the pull of social media, and the fear of missing out all combine to keep us reaching for our phones again and again.

Technology companies design their products to be habit-forming. The infinite scroll of social media means you never reach an endpoint. Notification sounds and badges trigger a dopamine response in the brain. Even the colors of app icons are carefully chosen to attract your attention. As one former tech executive said, the best way to get someone's attention is to promise a reward, and then deliver it unpredictably.

The effects of excessive phone use are becoming clearer. Studies link heavy smartphone use to poor sleep, increased anxiety, and reduced attention span. Relationships suffer when partners spend more time with their phones than with each other. And the constant distraction makes it harder to focus on deep, meaningful work.

Some countries are responding with regulations. Schools in several countries have banned phones during class time. Some workplaces encourage phone-free meetings. And a growing number of people are choosing to switch to simpler phones without internet access. Finding a healthy balance with technology may be one of the defining challenges of our time.`,
  },

  // ==================== VOA 初级 ====================
  {
    title: 'VOA — Learning to Say Sorry',
    category: 'culture',
    difficulty: 'beginner',
    sourceUrl: 'https://learningenglish.voanews.com',
    originalText: `Learning to say sorry is an important part of life. We all make mistakes. Sometimes we hurt other people without meaning to. When that happens, saying "I am sorry" can help fix the situation.

A good apology has several parts. First, you need to say what you did wrong. Second, you should show that you understand how the other person feels. Third, you should promise to do better in the future. Finally, you should actually try to change your behavior.

Some people find it very hard to apologize. They might feel embarrassed or ashamed. They might worry that apologizing makes them look weak. But experts say that apologizing actually shows strength. It takes courage to admit when you are wrong.

In different cultures, people apologize in different ways. In some countries, people say sorry very often, even for small things. In other places, apologies are saved for more serious situations. Learning the right way to apologize in each culture is an important skill.`,
  },
  {
    title: 'VOA — The Joy of Cooking at Home',
    category: 'culture',
    difficulty: 'beginner',
    sourceUrl: 'https://learningenglish.voanews.com',
    originalText: `More and more people are discovering the joy of cooking at home. During recent years, many of us spent more time in our kitchens than ever before. And something surprising happened. We started to enjoy it.

Cooking at home has many benefits. First, it is usually cheaper than eating at restaurants. Second, you have complete control over what goes into your food. You can choose fresh ingredients and avoid too much salt or sugar. Third, cooking can be a relaxing activity. Many people say that chopping vegetables or stirring a pot helps them feel calm after a busy day.

You do not need to be a professional chef to cook good food. Start with simple recipes. Learn to make a few basic dishes. As you gain confidence, you can try more complex recipes. The internet is full of cooking videos and instructions.

Cooking also brings people together. When you cook for friends or family, you share more than just food. You share an experience. The conversations around the dinner table are often the best part of any meal.`,
  },

  // ==================== 进阶内容 ====================
  {
    title: 'TED-Ed — How Languages Evolve',
    category: 'science',
    difficulty: 'advanced',
    sourceUrl: 'https://ed.ted.com',
    originalText: `There are more than seven thousand languages spoken in the world today. But linguists estimate that a language dies every two weeks. As languages disappear, we lose unique ways of seeing and understanding the world.

Languages evolve constantly. New words are created. Old words change their meaning. Grammar rules shift over generations. Think about the word "literally," which now often means "figuratively" in casual speech. Or consider how emojis have become a form of communication in digital messages.

Why do languages change? One reason is contact between different groups of people. When speakers of different languages interact, they borrow words and expressions from each other. English is a perfect example. It has borrowed words from Latin, French, German, Arabic, and many other languages.

Technology also drives language change. The internet has accelerated this process dramatically. New terms like "selfie," "hashtag," and "streaming" have entered our vocabulary in just the last decade.

Protecting endangered languages is important. Each language contains unique knowledge about the natural world, human relationships, and ways of thinking. When a language disappears, we lose a piece of our shared human heritage.`,
  },
  {
    title: 'Harvard Business Review — The Future of Remote Work',
    category: 'business',
    difficulty: 'advanced',
    sourceUrl: 'https://hbr.org',
    originalText: `Three years after the pandemic transformed how we work, companies are still struggling to find the right balance between remote and in-office work. Major technology companies have led the push to bring employees back to the office, while others have embraced permanent remote arrangements. The data suggests that neither extreme is optimal.

Research from Stanford University found that fully remote workers can be just as productive as their office-based colleagues, but they often miss out on mentorship opportunities and informal learning. Hybrid arrangements, where employees split their time between home and office, seem to offer the best of both worlds. However, implementing hybrid work effectively requires careful planning and clear communication.

Companies that have successfully adopted hybrid models share several common practices. They designate specific days for in-person collaboration. They invest in technology that makes remote participation seamless. And they train managers to evaluate performance based on results rather than visible presence in the office.

The commercial real estate market is already reflecting this shift. Office vacancy rates in major cities have reached historic highs. Some buildings are being converted to residential use. The changes ripple through urban economies, affecting everything from transit systems to lunch restaurants.`,
  },
];

export function createLibraryMaterial(item) {
  return createMaterial({
    title: item.title,
    originalText: item.originalText,
    sourceUrl: item.sourceUrl || '',
    audioAvailable: false,
    audioDuration: Math.round(item.originalText.split(/\s+/).length / 2.5),
    status: 'pending',
  });
}

function importMaterial(item, btn) {
  const material = createLibraryMaterial(item);
  upsertMaterial(material);

  btn.innerHTML = '<i class="fa-solid fa-check"></i> 已导入';
  btn.disabled = true;
  btn.style.background = 'var(--success)';
  showToast(`"${item.title}" 已导入`, 'success');
}

export function renderContentLibrary(container) {
  const categories = [...new Set(LIBRARY.map(m => m.category))];
  const diffMap = {
    beginner: { label: '初级', cefr: 'A2' },
    intermediate: { label: '中级', cefr: 'B1-B2' },
    advanced: { label: '高级', cefr: 'C1' },
  };

  container.innerHTML = `
    <div class="content-library">
      <div class="page-hero">
        <div>
          <div class="page-eyebrow">CURATED LISTENING</div>
          <h1 class="page-title">内容库</h1>
          <p class="page-subtitle">${LIBRARY.length} 篇精选素材，从真实语境进入英语概念世界。</p>
        </div>
        <div class="page-hero-orbit" aria-hidden="true"><i class="fa-solid fa-wave-square"></i></div>
      </div>

      ${categories.map(cat => `
        <section class="library-section">
          <div class="library-section-header">
            <div>
              <span class="library-section-icon"><i class="fa-solid ${catIcon(cat)}"></i></span>
              <h2>${catName(cat)}</h2>
            </div>
            <span>${LIBRARY.filter(m => m.category === cat).length} 篇</span>
          </div>
          <div class="library-grid">
              ${LIBRARY.filter(m => m.category === cat).map(m => `
                <article class="lib-item">
                  <div class="lib-item-topline">
                    <span class="lib-source">${sanitizeHTML(sourceName(m.title))}</span>
                    <span class="lib-level lib-level-${m.difficulty}">${diffMap[m.difficulty].cefr} · ${diffMap[m.difficulty].label}</span>
                  </div>
                  <div class="lib-item-content">
                    <h3>${sanitizeHTML(stripSource(m.title))}</h3>
                    <p>${sanitizeHTML(m.originalText.substring(0, 150))}...</p>
                  </div>
                  <div class="lib-item-meta">
                    <span><i class="fa-regular fa-file-lines"></i> ${m.originalText.split(/\s+/).length} 词</span>
                    <span><i class="fa-regular fa-clock"></i> 约 ${Math.max(2, Math.round(m.originalText.split(/\s+/).length / 130))} 分钟</span>
                    <span class="lib-audio-unavailable"><i class="fa-solid fa-volume-xmark"></i> 暂无音频，可自行导入音频</span>
                  </div>
                  <div class="lib-item-actions">
                    <button class="btn btn-primary btn-sm lib-import-btn" data-idx="${LIBRARY.indexOf(m)}">
                      <i class="fa-solid fa-plus"></i> 添加到学习计划
                    </button>
                    ${m.sourceUrl ? `
                      <a href="${sanitizeHTML(m.sourceUrl)}" target="_blank" class="btn btn-secondary btn-sm" title="前往来源网站下载音频">
                        来源 <i class="fa-solid fa-arrow-up-right-from-square"></i>
                      </a>
                    ` : ''}
                  </div>
                </article>
              `).join('')}
          </div>
        </section>
      `).join('')}

      <div class="library-note">
        <i class="fa-solid fa-circle-info"></i>
        <p>添加素材后，从来源网站下载音频并上传，即可进入分段精听工作台。</p>
      </div>
    </div>
  `;

  container.querySelectorAll('.lib-import-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx, 10);
      importMaterial(LIBRARY[idx], btn);
    });
  });
}

function catIcon(cat) {
  const m = {
    news: 'fa-newspaper',
    business: 'fa-briefcase',
    tech: 'fa-microchip',
    science: 'fa-flask',
    culture: 'fa-masks-theater',
  };
  return m[cat] || 'fa-file-lines';
}
function catName(cat) {
  const m = { news: '新闻', business: '商务', tech: '科技', science: '科学', culture: '文化' };
  return m[cat] || cat;
}

function sourceName(title) {
  const source = (title || '').split(/[—-]/)[0].trim();
  if (source.includes('BBC')) return 'BBC';
  if (source.includes('VOA')) return 'VOA';
  if (source.includes('TED')) return 'TED-Ed';
  if (source.includes('Harvard')) return 'HBR';
  return source || 'Editorial';
}

function stripSource(title) {
  const parts = (title || '').split(/\s+[—-]\s+/);
  return parts.length > 1 ? parts.slice(1).join(' — ') : title;
}

/**
 * 批量导入所有素材（不更新 UI）
 * @returns {number} 导入数量
 */
export function bulkImportAll() {
  let count = 0;
  for (const item of LIBRARY) {
    const material = createLibraryMaterial(item);
    upsertMaterial(material);
    count++;
  }
  return count;
}

export { LIBRARY };
