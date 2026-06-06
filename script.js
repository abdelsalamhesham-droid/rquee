const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const winMessage = document.getElementById('winMessage');
const cowAlert = document.getElementById('cowAlert');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
const targetScore = 3; 
let isGameOver = false;
let cowTimeout;

// متغير لمعرفة هل الشاشة بالطول (موبايل) ولا بالعرض (لاب توب)
let isMobile = canvas.height > canvas.width;

// إعداد القوس بناءً على نوع الشاشة
const bow = {
    x: isMobile ? canvas.width / 2 : 80,
    y: isMobile ? canvas.height - 100 : canvas.height / 2,
    radius: 45,
    isPulling: false,
    pullX: 0,
    pullY: 0
};
bow.pullX = bow.x;
bow.pullY = bow.y;

// إعداد الهدف بناءً على نوع الشاشة (أبعد بكتير وتحدي)
const target = {
    x: isMobile ? canvas.width / 2 : canvas.width * 0.82, 
    y: isMobile ? 120 : canvas.height / 2,
    radius: isMobile ? 30 : 35, // أصغر على الموبايل عشان الصعوبة والتحدي
    speed: isMobile ? 4 : 3.5,   // أسرع شوية على الموبايل
    direction: 1
};

let arrows = [];
let particles = []; 

class TrailParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 2;
        this.opacity = 1;
        this.fade = Math.random() * 0.04 + 0.03;
    }
    update() { this.opacity -= this.fade; }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = '#00ffff';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class Arrow {
    constructor(x, y, angle, speed) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.length = 35;
        this.isActive = true;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        if (this.isActive) {
            let tailX = this.x - Math.cos(this.angle) * this.length;
            let tailY = this.y - Math.sin(this.angle) * this.length;
            particles.push(new TrailParticle(tailX, tailY));
        }

        let dist = Math.hypot(this.x - target.x, this.y - target.y);
        if (dist < target.radius && this.isActive) {
            this.isActive = false;
            score++;
            if (score >= targetScore) {
                isGameOver = true;
                winMessage.classList.remove('hidden');
                winMessage.classList.add('show');
                cowAlert.classList.remove('cow-show');
            }
            return { hit: true, out: false };
        }

        // حدود الضياع متوافقة مع الاتجاهين
        if (this.x > canvas.width || this.x < 0 || this.y < 0 || this.y > canvas.height) {
            return { hit: false, out: true };
        }

        return { hit: false, out: false };
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowBlur = 12; ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-this.length, 0); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -4); ctx.lineTo(-8, 4); ctx.fill();
        ctx.restore();
    }
}

function triggerCowAlert() {
    if (isGameOver) return;
    clearTimeout(cowTimeout);
    cowAlert.classList.remove('cow-hidden');
    cowAlert.classList.add('cow-show');
    cowTimeout = setTimeout(() => {
        cowAlert.classList.remove('cow-show');
        cowAlert.classList.add('cow-hidden');
    }, 1500);
}

function startPull(clientX, clientY) {
    if (isGameOver) return;
    let dist = Math.hypot(clientX - bow.x, clientY - bow.y);
    if (dist < 120) { bow.isPulling = true; }
}

function movePull(clientX, clientY) {
    if (!bow.isPulling) return;
    let angle = Math.atan2(clientY - bow.y, clientX - bow.x);
    let dist = Math.hypot(clientX - bow.x, clientY - bow.y);
    if (dist > 70) dist = 70;

    bow.pullX = bow.x + Math.cos(angle) * dist;
    bow.pullY = bow.y + Math.sin(angle) * dist;
}

function endPull() {
    if (!bow.isPulling) return;
    bow.isPulling = false;

    let angle = Math.atan2(bow.y - bow.pullY, bow.x - bow.pullX);
    let dist = Math.hypot(bow.x - bow.pullX, bow.y - bow.pullY);
    
    if (dist > 10) {
        let speed = (dist / 70) * 16 + 6;
        arrows.push(new Arrow(bow.x, bow.y, angle, speed));
    }

    bow.pullX = bow.x; bow.pullY = bow.y;
}

window.addEventListener('mousedown', (e) => startPull(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => movePull(e.clientX, e.clientY));
window.addEventListener('mouseup', endPull);

window.addEventListener('touchstart', (e) => startPull(e.touches[0].clientX, e.touches[0].clientY));
window.addEventListener('touchmove', (e) => movePull(e.touches[0].clientX, e.touches[0].clientY));
window.addEventListener('touchend', endPull);

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // حركة الهدف (يمين وشمال للموبايل، وفوق وتحت للاب توب)
    if (!isGameOver) {
        if (isMobile) {
            target.x += target.speed * target.direction;
            if (target.x > canvas.width - 50 || target.x < 50) target.direction *= -1;
        } else {
            target.y += target.speed * target.direction;
            if (target.y > canvas.height - 80 || target.y < 80) target.direction *= -1;
        }
    }

    // رسم الهدف
    ctx.save();
    ctx.shadowBlur = 15; ctx.shadowColor = '#ff3344';
    ctx.beginPath(); ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3344'; ctx.fill();
    ctx.beginPath(); ctx.arc(target.x, target.y, target.radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.arc(target.x, target.y, target.radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3344'; ctx.fill();
    ctx.restore();

    // رسم خط التوقع المنقط الطويل
    if (bow.isPulling) {
        let launchAngle = Math.atan2(bow.y - bow.pullY, bow.x - bow.pullX);
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.45)'; ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(bow.x, bow.y);
        ctx.lineTo(bow.x + Math.cos(launchAngle) * 800, bow.y + Math.sin(launchAngle) * 800); 
        ctx.stroke();
        ctx.restore();
    }

    // رسم القوس والوتر
    let bowAngle = Math.atan2(bow.pullY - bow.y, bow.pullX - bow.x) + Math.PI;
    ctx.save();
    ctx.shadowBlur = 15; ctx.shadowColor = '#44ff44';
    ctx.strokeStyle = '#44ff44'; ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(bow.x, bow.y, bow.radius, bowAngle - Math.PI/2, bowAngle + Math.PI/2);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bow.x + Math.sin(bowAngle)*bow.radius, bow.y - Math.cos(bowAngle)*bow.radius);
    ctx.lineTo(bow.pullX, bow.pullY);
    ctx.lineTo(bow.x - Math.sin(bowAngle)*bow.radius, bow.y + Math.cos(bowAngle)*bow.radius);
    ctx.stroke();

    // رسم الجزيئات والأسهم
    particles.forEach(p => p.update());
    particles = particles.filter(p => { p.draw(); return p.opacity > 0; });

    arrows = arrows.filter(arrow => {
        let status = arrow.update();
        if (status.out) { triggerCowAlert(); return false; }
        if (status.hit) return false;
        arrow.draw();
        return true;
    });

    // النتيجة
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Score: ${score} / ${targetScore}`, 25, 45);

    requestAnimationFrame(gameLoop);
}

// دالة إعادة ضبط المقاسات الذكية
function resizeGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    isMobile = canvas.height > canvas.width;

    bow.x = isMobile ? canvas.width / 2 : 80;
    bow.y = isMobile ? canvas.height - 120 : canvas.height / 2;
    bow.pullX = bow.x;
    bow.pullY = bow.y;

    target.x = isMobile ? canvas.width / 2 : canvas.width * 0.82;
    target.y = isMobile ? 120 : canvas.height / 2;
    target.radius = isMobile ? 28 : 35;
    target.speed = isMobile ? 4.5 : 3.5;
}

window.addEventListener('resize', resizeGame);
resizeGame();
gameLoop();
