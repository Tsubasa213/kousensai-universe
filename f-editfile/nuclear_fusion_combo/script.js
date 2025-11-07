const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ピクセルサイズをブラウザのサイズに合わせる
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 背景を黒に設定
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// ウィンドウサイズ変更時もリサイズ
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// 初期化
let mouse = { x: 0, y: 0, dx: 0, dy: 0 };
let elements = [];
let stage = 1;
let IsMouseDown = false;
let temperature = 10000000; // 初期温度1000万度
let coreChangingTime = 0;
let count = 0;
let bombingCount = -250;
const maxTemps = [10000000, 100000000, 600000000, 1200000000, 1500000000, 2500000000, 3000000000];
const risingWidths = [0, 15000000, 60000000, 60000000, 50000000, 90000000, 40000000];
const guides = [
    [[["H", "H", "H", "H"], ["He", "n"]]],
    [[["He", "He", "He"], ["C", "n"]], [["C", "He"], ["O", "n"]]],
    [[["C", "C"], ["Ne", "He", "n"]], [["C", "C"], ["Na", "n"]], [["C", "C"], ["Mg", "n"]]],
    [[["Ne", "n"], ["He", "n"]], [["Ne", "He"], ["Mg", "n"]]],
    [[["O", "O"], ["Si", "He", "n"]], [["O", "O"], ["S", "n"]]],
    [[["Si", "Si"], ["S", "He", "n"]], [["Si", "S"], ["Ar", "n"]], [["Ar", "Ar"], ["Ca", "n"]], [["Si", "Ar"], ["Fe", "n"]]]
];
const coreColor = [
    ["#ffffff", "#b3ecff", "#66ccff", "#3388ff"],
    ["#fff8dc", "#ffe680", "#ffd24c", "#ffae00"],
    ["#fff4e6", "#ffcc80", "#ff8a00", "#ff4500"],
    ["#ffffff", "#ffd1dc", "#ff5c33", "#cc2200"],
    ["#fff2e0", "#ffd966", "#ff7f50", "#e63900"],
    ["#ffffff", "#e6ccff", "#b399ff", "#6f42c1"],
    ["#ffffff", "#ffe680", "#ff0000", "#000000"]
];

// メインループ
const main = () => {
    // 画面クリア
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    drawRect(0, 0, canvas.width, canvas.height, coreColor[stage - 1][3]);
    ctx.globalAlpha = 0.5;
    drawRect(0, 0, canvas.width, canvas.height, "#000000");
    
    ctx.restore();

    // マウスドラッグ処理
    if (IsMouseDown) {
        // 元素が押されているならドラッグ中にする
        if (!elements.some((element) => element.isDragging)) {
            elements.forEach((element) => {
            if (element.type == "n") return;
            let dx = mouse.x - element.x;
            let dy = mouse.y - element.y;
            let dist = Math.hypot(dx, dy);

            if (dist < element.size && element.invincibleTime <= 0) {
                element.isDragging = true;
            }
        });
        }

        // ドラッグ中の元素をマウス位置に追従
        elements.forEach((element) => {
            if (element.isDragging) {
                element.x += mouse.dx;
                element.y += mouse.dy;
            }
        });
        mouse.dx = 0;
        mouse.dy = 0;

        // ドラッグしている元素の条件を満たしたら核融合
        // ネオンとニュートリノの核融合は特殊なので別でやる
        const draggingElements = elements.filter((element) => element.isDragging);
        if (draggingElements.every((element) => element.type == "H") && draggingElements.length >= 4 && stage == 1) {
            // 水素4つでヘリウム生成
            fusionElements(draggingElements, [[{ name: "He", isDeleting: true }]]);
            
        } else if (draggingElements.every((element) => element.type == "He") && draggingElements.length >= 3 && stage == 2) {
            // ヘリウム3つで炭素生成
            fusionElements(draggingElements, [[{ name: "C", isDeleting: false }]]);
        } else if (draggingElements.some((element) => element.type == "C") && draggingElements.some((element) => element.type == "He") && draggingElements.length == 2 && stage == 2) {
            // 炭素とヘリウムで酸素生成
            fusionElements(draggingElements, [[{ name: "O", isDeleting: true }]]);
        } else if (draggingElements.every((element) => element.type == "C") && draggingElements.length >= 2 && stage == 3) {
            // 炭素2つでネオンとヘリウムまたはナトリウムまたはマグネシウム生成
            fusionElements(draggingElements, [[{ name: "Ne", isDeleting: true }, { name: "He", isDeleting: true }], [{ name: "Na", isDeleting: true }], [{ name: "Mg", isDeleting: true }]]);
        } else if (draggingElements.some((element) => element.type == "Ne") && draggingElements.some((element) => element.type == "He") && draggingElements.length == 2 && stage == 4) {
            // ネオンとヘリウムでマグネシウム生成
            fusionElements(draggingElements, [[{ name: "Mg", isDeleting: true }]]);
        } else if (draggingElements.every((element) => element.type == "O") && draggingElements.length >= 2 && stage == 5) {
            // 酸素二つでケイ素とヘリウムまたは硫黄生成
            fusionElements(draggingElements, [[{ name: "Si", isDeleting: true }, { name: "He", isDeleting: true }], [{ name: "S", isDeleting: true }]]);
        } else if (draggingElements.every((element) => element.type == "Si") && draggingElements.length >= 2 && stage == 6) {
            // ケイ素2つで硫黄とヘリウム生成
            fusionElements(draggingElements, [[{ name: "S", isDeleting: false }, { name: "He", isDeleting: true }]]);
        } else if (draggingElements.some((element) => element.type == "Si") && draggingElements.some((element) => element.type == "S") && draggingElements.length == 2 && stage == 6) {
            // ケイ素と硫黄でアルゴン生成
            fusionElements(draggingElements, [[{ name: "Ar", isDeleting: false }]]);
        } else if (draggingElements.every((element) => element.type == "Ar") && draggingElements.length >= 2 && stage == 6) {
            // アルゴン2つでカルシウム生成
            fusionElements(draggingElements, [[{ name: "Ca", isDeleting: false }]]);
        } else if (draggingElements.some((element) => element.type == "Si") && draggingElements.some((element) => element.type == "Ca") && draggingElements.length == 2 && stage == 6) {
            // ケイ素とカルシウムで鉄生成
            fusionElements(draggingElements, [[{ name: "Fe", isDeleting: true }]]);
        }
    } else {
        // マウスが離されたら全ての元素をドラッグ終了にする
        elements.forEach((element) => {
            element.isDragging = false;
        });
    }

    // 元素生成チェック
    const withoutNElements = elements.filter((element) => element.type != "n"); // ニュートリノを除外
    if (withoutNElements.length < 5) {
        createElement("", 0, 0, 0, 0, false);
    } else if (withoutNElements.length < 10) {
        if (Math.random() < 0.01) {
            createElement("", 0, 0, 0, 0, false);
        }
    }
    // ニュートリノもここで出す
    const neutrinoCount = elements.filter((element) => element.type == "n").length;
    if (neutrinoCount < stage * 3 && bombingCount < -100) {
        createElement("n", 0, 0, 0, 0, false);
    }

    // 元素削除処理
    elements = elements.filter((element) => !(element.isDeleting && element.invincibleTime <= 0));

    // 元素移動
    elements.forEach((element) => {
        // ドラッグ中でないなら移動
        if (!element.isDragging) {
            element.x += element.vx;
            element.y += element.vy;
        }

        // 出現したばかりならば
        if (element.invincibleTime > 0) {
            element.invincibleTime--;
            return;
        }

        // 画面外判定)
        if ((element.x - element.size < 0 || element.x + element.size > canvas.width) && element.type != "n") {
            element.vx *= -1;
            if (element.x - element.size < 0) {
                element.x = element.size;
            } else {
                element.x = canvas.width - element.size;
            }
        }
        if ((element.y - element.size < 0 || element.y + element.size > canvas.height) && element.type != "n") {
            element.vy *= -1;
            if (element.y - element.size < 0) {
                element.y = element.size;
            } else {
                element.y = canvas.height - element.size;
            }
        }
        // ニュートリノは画面外に出たら削除
        if (element.type == "n" && (element.x + element.size < 0 || element.x - element.size > canvas.width || element.y + element.size < 0 || element.y - element.size > canvas.height)) {
            element.isDeleting = true;
        }

        // 衝突判定
        elements.forEach((other) => {
            if (element != other) {
                let dx = other.x - element.x;
                let dy = other.y - element.y;
                let dist = Math.hypot(dx, dy); // 距離

                if (dist < element.size + other.size) {
                    // ネオンとニュートリノの核融合は特殊なのでここでやる
                    if ((element.type == "n" || other.type == "n")) {
                        const draggingElements = elements.filter((el) => el.isDragging);
                        if (draggingElements.length == 1 && (element.type == "Ne" && element == draggingElements[0] || other.type == "Ne" && other == draggingElements[0]) && stage == 4) {
                            elements = elements.filter((el) => el != element && el != other);
                            temperature += risingWidths[stage];
                            const elementsCoordinates = calcCenter(draggingElements);
                            createElement("O", elementsCoordinates.x, elementsCoordinates.y, 0, -1, true);
                            createElement("He", elementsCoordinates.x, elementsCoordinates.y, 0, 0, false);
                        }
                        return;
                    }

                    // 重なり（めり込み）補正
                    const overlap = (element.size + other.size) - dist;
                    if (overlap > 0) {
                        // 法線方向の単位ベクトル
                        const nx = dx / dist;
                        const ny = dy / dist;
                        // 等質量なのでお互い半分ずつ押し戻す
                        element.x -= nx * overlap / 2;
                        element.y -= ny * overlap / 2;
                        other.x += nx * overlap / 2;
                        other.y += ny * overlap / 2;
                    }

                    if (element.isDragging || other.isDragging) {
                        element.isDragging = true;
                        other.isDragging = true;
                        return; // ドラッグ中は速度変更しない
                    }

                    // 法線・接線方向の単位ベクトル
                    const nx = dx / dist;  // 法線方向（衝突線方向）
                    const ny = dy / dist;
                    const tx = -ny;        // 接線方向（法線に垂直）
                    const ty = nx;

                    // 各速度の大きさ（保持したい値）
                    const se = Math.hypot(element.vx, element.vy);
                    const so = Math.hypot(other.vx, other.vy);

                    // 各速度ベクトルを法線・接線方向に分解
                    const vet = element.vx * tx + element.vy * ty; // elementの接線方向速度
                    const vot = other.vx * tx + other.vy * ty; // otherの接線方向速度

                    // 大きさを保持した法線方向速度
                    const ven_mag = Math.sqrt(Math.max(0, se * se - vet * vet));
                    const von_mag = Math.sqrt(Math.max(0, so * so - vot * vot));

                    // 弾性衝突の法線方向速度
                    const ven_after = -Math.abs(ven_mag);
                    const von_after =  Math.abs(von_mag);

                    // 法線＋接線成分を合成して新しい速度ベクトルに戻す
                    element.vx = ven_after * nx + vet * tx;
                    element.vy = ven_after * ny + vet * ty;
                    other.vx = von_after * nx + vot * tx;
                    other.vy = von_after * ny + vot * ty;
                }
            }
        });
    });

    // ステージ更新
    if (temperature >= maxTemps[stage] && stage < 7) {
        stage++;
        coreChangingTime = 20;
        elements.forEach((element) => {
            element.invincibleTime = 20; 
            element.isDeleting = true;
        });
    };
    if (stage == 7) {
        console.log(bombingCount);
        if (bombingCount >= 250) {
            clearInterval(gameInterval);
            return;
        }
    };

    // コア描画
    const coreSize = stage * 40 + 100 - coreChangingTime * 40 / 20 + 2 * stage * Math.sin(count / 100) + Math.max(0, bombingCount * 10); 
    ctx.save();
    ctx.globalAlpha = 0.7 - (coreChangingTime * 0.7 / 20);
    let radgradient1 = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, coreSize);
    radgradient1.addColorStop(0, coreColor[stage - 1][0]);
    radgradient1.addColorStop(1, coreColor[stage - 1][1]);
    radgradient1.addColorStop(1, coreColor[stage - 1][2]);
    radgradient1.addColorStop(1, coreColor[stage - 1][3]);
    drawArc(canvas.width / 2, canvas.height / 2, coreSize, radgradient1);
    ctx.restore();
    // 滑らかに変化するための時間経過
    if (coreChangingTime > 0) {
        ctx.save();
        ctx.globalAlpha = coreChangingTime * 0.7 / 20;
        let radgradient2 = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, coreSize);
        radgradient2.addColorStop(0, coreColor[stage - 2][0]);
        radgradient2.addColorStop(1, coreColor[stage - 2][1]);
        radgradient2.addColorStop(1, coreColor[stage - 2][2]);
        radgradient2.addColorStop(1, coreColor[stage - 2][3]);
        drawArc(canvas.width / 2, canvas.height / 2, coreSize, radgradient2);
        ctx.restore();
        coreChangingTime--;
    }
    

    // 元素描画
    elements.forEach((element) => {
        ctx.save();
        if (element.isDeleting) ctx.globalAlpha = element.invincibleTime / 20;
        drawElement(element);
        ctx.restore();
    });

    // 合成ガイド描写
    if (stage <= 6) {
        drawText("ステージ: " + stage, 20, 40, "20px Arial", "#ffffff");
        drawText("現在できる合成: ", 20, 70, "20px Arial", "#ffffff");
        drawGuide(guides[stage - 1]);
    }

    // 温度描写
    if (stage < maxTemps.length) {
        temperature -= risingWidths[stage] / 2000; // 徐々に冷却
    } else {
        temperature = maxTemps[maxTemps.length - 1];
    }
    if (temperature < maxTemps[stage - 1]) {
        temperature = maxTemps[stage - 1];
    }
    drawText("温度: " + Math.floor(temperature) + " K", 20, canvas.height - 50, "20px Arial", "#ffffff");

    // 温度バー描写
    let maxTemp, tempBarWidth;
    if (stage < maxTemps.length) {
        maxTemp = maxTemps[stage] - maxTemps[stage - 1];
        tempBarWidth = (canvas.width - 40) * (temperature - maxTemps[stage - 1]) / maxTemp;
    } else {
        tempBarWidth = (canvas.width - 40);
    }
    drawLine(20, canvas.height - 40, 20 + tempBarWidth, canvas.height - 40, "#ff0000", 2);
    drawLine(20 + tempBarWidth, canvas.height - 40, canvas.width - 20, canvas.height - 40, "#ffffff", 1);

    // カウントを進める
    count++;
    if (stage == 7) {
        bombingCount++;
    }
}

// 元素作成
const createElement = (type, x, y, vx, vy, isDeleting) => {
    // クリアすると、元素を作らなくなる
    if (stage > 7) {
        return;
    }

    // 種類設定
    if (!type) {
        if (stage > 6) {
            return;
        }
        const elementTypes = ["H", "He", "C", "Ne", "O", "Si"];
        type = elementTypes[stage - 1];
    }

    // 出現位置設定
    let size = 15;
    if (type == "n") {
        size = 3;
    }
    let pos = { x: x, y: y };
    let posStandard = Math.random() * 4;
    if (!pos.x && !pos.y){
        if (posStandard < 2){
            pos.x = Math.random() * (canvas.width - size) + size;
            pos.y = (posStandard < 1) ? -size : canvas.height + size;
        } else {
            pos.x = (posStandard < 3) ? -size : canvas.width + size;
            pos.y = Math.random() * (canvas.height - size) + size;
        }
    }

    // 初期速度設定
    let velocity = { x: vx, y: vy };
    if (!vx && !vy) {
        // 位置に応じて向きを変える
        const angle = Math.random() * Math.PI / 2 + (pos.x <= canvas.width / 2 && pos.y <= canvas.height / 2 ? 0 : canvas.width / 2 <= pos.x && pos.y <= canvas.height / 2 ? Math.PI * 1/2 : canvas.width / 2 <= pos.x && canvas.height / 2 <= pos.y ? Math.PI : Math.PI * 3/2);
        if (type == "C") {
            velocity.x = 6 * Math.cos(angle);
            velocity.y = 6 * Math.sin(angle);
        } else if (type == "O") {
            velocity.x = 7 * Math.cos(angle);
            velocity.y = 7 * Math.sin(angle);
        } else {
            velocity.x = 5 * Math.cos(angle);
            velocity.y = 5 * Math.sin(angle);
        }
    }

    // 元素追加
    if (type == "n") {
        elements.unshift({ type: type, x: pos.x, y: pos.y, vx: velocity.x, vy: velocity.y, size: size, invincibleTime: 20, isDeleting: isDeleting, isDragging: false });
        return;
    }
    elements.push({ type: type, x: pos.x, y: pos.y, vx: velocity.x, vy: velocity.y, size: size, invincibleTime: 20, isDeleting: isDeleting, isDragging: false });
};

// 中心計算
const calcCenter = (objects) => {
    const center = { x: 0, y: 0 };
    objects.forEach((obj) => {
        center.x += obj.x;
        center.y += obj.y;
    });
    center.x /= objects.length;
    center.y /= objects.length;
    return center;
};

// 核融合処理
const fusionElements = (draggingElements, creatingElements) => {
    elements = elements.filter((element) => !element.isDragging);
    temperature += risingWidths[stage];
    const elementsCoordinates = calcCenter(draggingElements);
    const randomValue = Math.floor(Math.random() * creatingElements.length);
    creatingElements[randomValue].forEach((creatingElement, i) => {
        let velocity = { x: 0, y: -1 };
        if (!creatingElement.isDeleting) {
            velocity.y = 0;
        } else if (creatingElements[randomValue].filter((element) => element.isDeleting).length >= 2) {
            velocity.x = (i - 0.5) * 2 * ((1 / creatingElements[randomValue].length) ** 0.5);
            velocity.y = -((1 / creatingElements[randomValue].length) ** 0.5);
        }
        createElement(creatingElement.name, elementsCoordinates.x, elementsCoordinates.y, velocity.x, velocity.y, creatingElement.isDeleting);
    });
    createElement("n", elementsCoordinates.x, elementsCoordinates.y, 0, 0, false);
};

// 元素の色取得
const elementColor = (type) => {
    if (type == "H") {
        return "#a0e4ff";
    } else if (type == "He") {
        return "#ffd87a";
    } else if (type == "C") {
        return "#444444";
    } else if (type == "O") {
        return "#ff3d2e";
    } else if (type == "Ne") {
        return "#ff8a00";
    } else if (type == "Na") {
        return "#fff000";
    } else if (type == "Mg") {
        return "#e8f0ff";
    } else if (type == "Si") {
        return "#b5651d";
    } else if (type == "S") {
        return "#baff4a";
    } else if (type == "Fe") {
        return "#8d99a6";
    } else if (type == "Ar") {
        return "#7B68EE";
    } else if (type == "Ca") {
        return "#c0d6ff";
    } else if (type == "n") {
        return "#ffffff";
    } else {
        return "#000000";
    }
}

// テキスト描画
const drawText = (text, x, y, font, color) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(text, x, y);
    ctx.closePath();
};

// 直線描画
const drawLine = (x1, y1, x2, y2, color, lineWidth) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
};

// 円描画
const drawArc = (x, y, radius, color) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
};

const drawRect = (x, y, width, height, color) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    ctx.closePath();
};

// 右向き矢印描画
const drawArrowToRight = (x1, y1, x2, y2, color, lineWidth) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    drawLine(x1, y1, x2, y2, color, lineWidth);
    drawLine(x2 - 5, y2 - 5, x2, y2, color, lineWidth);
    drawLine(x2 - 5, y2 + 5, x2, y2, color, lineWidth);
    ctx.stroke();
    ctx.closePath();
}

// 元素描画
const drawElement = (element) => {
    drawArc(element.x, element.y, element.size, elementColor(element.type));
    if (element.type == "n") return;
    drawText(element.type, element.x - element.size / 2 - element.type.length * 5 + 5, element.y + element.size / 2, "20px Arial", "#000000");
};

// 合成ガイド描画
const drawGuide = (drawingElements) => {
    drawingElements.forEach((drawingElement, index) => {
        drawingElement[0].forEach((el, i) => {
            let size = 15;
            if (el == "n") {
                size = 3;
            }
            drawElement({ type: el, x: 35 + i * 30, y: 95 + index * 40, size: size });
        });
        drawArrowToRight(35 + drawingElement[0].length * 30 - 10, 95 + index * 40, 35 + drawingElement[0].length * 30 + 10, 95 + index * 40, "#ffffff", 2);
        drawingElement[1].forEach((el, i) => {
            let size = 15;
            if (el == "n") {
                size = 3;
            }
            drawElement({ type: el, x: 35 + (drawingElement[0].length + 1) * 30 + i * 35, y: 95 + index * 40, size: size });
        });
    });
}

// マウス・タッチイベント
window.addEventListener("mousedown", (e) => {
    IsMouseDown = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.dx = 0;
    mouse.dy = 0;
});

window.addEventListener("touchstart", (e) => {
    IsMouseDown = true;
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    mouse.dx = 0;
    mouse.dy = 0;
});

window.addEventListener("mouseup", (e) => {
    IsMouseDown = false;
    mouse.dx = 0;
    mouse.dy = 0;
});

window.addEventListener("touchend", (e) => {
    IsMouseDown = false;
    mouse.dx = 0;
    mouse.dy = 0;
});

window.addEventListener("mousemove", (e) => {
    mouse.dx = e.clientX - mouse.x;
    mouse.dy = e.clientY - mouse.y;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener("touchmove", (e) => {
    mouse.dx = e.touches[0].clientX - mouse.x;
    mouse.dy = e.touches[0].clientY - mouse.y;
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
});

let gameInterval = setInterval(main, 10);