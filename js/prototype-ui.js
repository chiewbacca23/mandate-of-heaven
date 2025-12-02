// Three Kingdoms Prototype - UI Module
import { GAME_CONFIG } from './prototype-config.js';

export class UIManager {
    constructor(game) {
        this.game = game;
    }

    updateAll() {
        this.updateGameInfo();
        this.updatePlayerState();
        this.updateActionArea();
        this.updateLog();
    }

    updateGameInfo() {
        document.getElementById('turnDisplay').textContent = this.game.gameState.turn;
        document.getElementById('phaseDisplay').textContent = this.game.gameState.phase;
        
        const event = this.game.gameState.currentEvent;
        if (event) {
            const eventName = event.Name || event.name || 'Unknown Event';
            const leadingResource = event.Leading_resource || event.leading_resource || event.leadingResource || 'military';
            const icon = GAME_CONFIG.RESOURCE_ICONS[leadingResource] || '❓';
            
            document.getElementById('eventDisplay').textContent = eventName;
            document.getElementById('leadingDisplay').textContent = `${icon} ${leadingResource}`;
        }
        
        const player = this.game.gameState.player;
        if (player) {
            document.getElementById('scoreDisplay').textContent = player.score;
            document.getElementById('emergencyDisplay').textContent = player.emergencyUsed;
        }
    }

    updatePlayerState() {
        const player = this.game.gameState.player;
        if (!player) return;
        
        // Hand count and display
        document.getElementById('handCount').textContent = player.hand.length;
        const handArea = document.getElementById('handArea');
        if (handArea) {
            if (player.hand.length === 0) {
                handArea.innerHTML = '<div style="padding:10px;color:#888;">No cards in hand</div>';
            } else {
                handArea.innerHTML = player.hand.map(card => this.renderCard(card, 'compact')).join('');
            }
        }
        
        // Battlefield resources
        const resources = player.calculateBattlefieldResources();
        document.getElementById('resourcesDisplay').innerHTML = GAME_CONFIG.RESOURCES.map(r =>
            `<span>${GAME_CONFIG.RESOURCE_ICONS[r]} ${resources[r]}</span>`
        ).join('');
        
        // Titles
        document.getElementById('titleCount').textContent = player.titles.length;
        const ownedTitles = document.getElementById('ownedTitles');
        if (ownedTitles) {
            ownedTitles.innerHTML = player.titles.map(({ title, retiredWith }) => {
                const titleName = title.name || title.Name || 'Unknown';
                const heroName = retiredWith.name || retiredWith.Name || 'Unknown';
                const score = this.game.calculateTitleScore(title);
                return `
                    <div class="title-item">
                        <div class="title-item-name">${titleName}</div>
                        <div class="title-item-score">${score} points</div>
                        <div style="font-size:0.8em;color:#aaa;">Retired: ${heroName}</div>
                    </div>
                `;
            }).join('') || '<div style="padding:10px;color:#888;">No titles yet</div>';
        }
        
        // All heroes breakdown
        const allHeroesArea = document.getElementById('allHeroes');
        if (allHeroesArea) {
            const inHand = player.getHandHeroes();
            const onField = player.getBattlefieldHeroes();
            const retired = player.retiredHeroes;
            
            allHeroesArea.innerHTML = `
                <div class="hero-group">
                    <strong>In Hand (${inHand.length}):</strong><br>
                    ${inHand.length ? inHand.map(h => h.name || h.Name).join(', ') : 'None'}
                </div>
                <div class="hero-group">
                    <strong>On Battlefield (${onField.length}):</strong><br>
                    ${onField.length ? onField.map(h => h.name || h.Name).join(', ') : 'None'}
                </div>
                ${retired.length > 0 ? `
                    <div class="hero-group">
                        <strong>Retired (${retired.length}):</strong><br>
                        ${retired.map(h => h.name || h.Name).join(', ')}
                    </div>
                ` : ''}
            `;
        }
        
        document.getElementById('heroCount').textContent = player.getAllHeroes().length;
    }

    updateActionArea() {
        // Hide all phase areas
        document.querySelectorAll('.phase-area').forEach(el => el.style.display = 'none');
        
        const phase = this.game.gameState.phase;
        if (phase === 'deployment') {
            document.getElementById('actionTitle').textContent = 'Deployment Phase';
            document.getElementById('deploymentPhase').style.display = 'block';
            this.renderDeploymentUI();
        } else if (phase === 'purchase') {
            document.getElementById('actionTitle').textContent = 'Purchase Phase';
            document.getElementById('purchasePhase').style.display = 'block';
            this.renderPurchaseUI();
        } else if (phase === 'gameover') {
            document.getElementById('actionTitle').textContent = 'Game Over';
            document.getElementById('gameOverPhase').style.display = 'block';
            this.renderGameOver();
        }
    }

    renderDeploymentUI() {
        const cardsArea = document.getElementById('deploymentCards');
        const player = this.game.gameState.player;
        
        // Show cards that aren't already deployed
        const availableCards = player.hand.filter(card => {
            return !GAME_CONFIG.KINGDOMS.some(k => 
                this.game.deployment[k].some(deployed => 
                    (deployed.id && card.id && deployed.id === card.id) || deployed === card
                )
            );
        });
        
        if (availableCards.length === 0) {
            cardsArea.innerHTML = '<div style="padding:20px;color:#888;">All cards deployed</div>';
        } else {
            cardsArea.innerHTML = availableCards.map(card => {
                const name = card.name || card.Name || 'Unknown';
                const allegiance = card.allegiance || card.Allegiance || '';
                const isSelected = this.game.selectedCards.includes(card.id);
                
                return `
                    <div class="card ${isSelected ? 'selected' : ''}" 
                         onclick="game.toggleCardSelection('${card.id}')">
                        <div class="card-name">${name}</div>
                        ${allegiance ? `<div class="card-allegiance">${allegiance}</div>` : ''}
                        <div class="card-resources">${this.formatStats(card)}</div>
                    </div>
                `;
            }).join('');
        }
        
        // Render drop zones with direct onclick
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            const zone = document.getElementById(`${kingdom}Deployment`);
            
            const deployedCards = this.game.deployment[kingdom].map(card => {
                const name = card.name || card.Name || 'Unknown';
                return `
                    <div class="card" onclick="game.removeFromDeployment('${card.id}', '${kingdom}'); event.stopPropagation();">
                        <div class="card-name">${name}</div>
                        <small style="color:#888;">Click to remove</small>
                    </div>
                `;
            }).join('');
            
            // Set zone content and add click handler
            if (this.game.deployment[kingdom].length === 0) {
                zone.innerHTML = `<div style="padding:40px 20px;color:#666;text-align:center;font-size:0.9em;">Click to deploy selected card here</div>`;
            } else {
                zone.innerHTML = deployedCards;
            }
            
            // Use setAttribute for onclick to make it work
            zone.setAttribute('onclick', `game.handleZoneClick('${kingdom}')`);
        });
    }

    renderPurchaseUI() {
        const player = this.game.gameState.player;
        const emergency = this.game.getEmergencyBonus();
        
        // Hero market
        const heroMarket = document.getElementById('heroMarket');
        heroMarket.innerHTML = this.game.gameState.heroMarket.map(hero => {
            const affordable = player.canAfford(hero.cost, emergency);
            const isSelected = this.game.selectedPurchase?.item === hero;
            
            return this.renderMarketCard(hero, 'hero', affordable, isSelected);
        }).join('');
        
        // Title market
        const titleMarket = document.getElementById('titleMarket');
        titleMarket.innerHTML = this.game.gameState.titleMarket.map(title => {
            const affordable = player.canAfford(title.cost, emergency);
            const hasHero = player.findEligibleHero(title) !== null;
            const isSelected = this.game.selectedPurchase?.item === title;
            
            return this.renderMarketCard(title, 'title', affordable && hasHero, isSelected);
        }).join('');
        
        // Update confirm button
        document.getElementById('confirmPurchaseBtn').disabled = !this.game.selectedPurchase;
    }

    renderMarketCard(item, type, affordable, isSelected) {
        if (type === 'hero') {
            const name = item.name || item.Name || 'Unknown';
            const allegiance = item.allegiance || item.Allegiance || '?';
            const role = (item.roles && item.roles[0]) || item.Role || '?';
            
            return `
                <div class="card ${affordable ? 'affordable' : 'unaffordable'} ${isSelected ? 'selected' : ''}"
                     onclick='game.selectPurchase("hero", ${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                    <div class="card-name">${name}</div>
                    <div class="card-allegiance">${allegiance} - ${role}</div>
                    <div class="card-resources">${this.formatStats(item)}</div>
                    <div class="card-cost">Cost: ${this.formatCost(item.cost)}</div>
                </div>
            `;
        } else {
            const name = item.name || item.Name || 'Unknown';
            const requirement = item.Required_Hero || item.requirement || 'Any hero';
            const points = item.points || item.Set_Scoring || [0];
            const setDesc = item.Set_Description || item.setDescription || '';
            
            return `
                <div class="card ${affordable ? 'affordable' : 'unaffordable'} ${isSelected ? 'selected' : ''}"
                     onclick='game.selectPurchase("title", ${JSON.stringify(item).replace(/'/g, "&apos;")})'>
                    <div class="card-name">${name}</div>
                    <div class="card-requirement">Requires: ${requirement}</div>
                    ${setDesc ? `<div class="card-allegiance">${setDesc}</div>` : ''}
                    <div class="card-cost">Cost: ${this.formatCost(item.cost)}</div>
                    <div class="card-points">Points: ${points.join(' → ')}</div>
                </div>
            `;
        }
    }

    renderCard(card, style = 'full') {
        const name = card.name || card.Name || 'Unknown';
        const allegiance = card.allegiance || card.Allegiance || '';
        
        if (style === 'compact') {
            return `
                <div class="card" style="margin:5px 0;">
                    <div class="card-name">${name}</div>
                    ${allegiance ? `<div class="card-allegiance" style="font-size:0.8em;">${allegiance}</div>` : ''}
                    <div class="card-resources" style="font-size:0.85em;">${this.formatStats(card)}</div>
                </div>
            `;
        }
        return `<div class="card"><div class="card-name">${name}</div></div>`;
    }

    renderGameOver() {
        const finalScore = document.getElementById('finalScore');
        const player = this.game.gameState.player;
        
        let html = `<h3>Final Score: ${player.score} points</h3>`;
        html += `<div style="margin:20px 0;">`;
        html += `<p>Titles Earned: ${player.titles.length}</p>`;
        html += `<p>Emergency Uses: ${player.emergencyUsed} (-${player.emergencyUsed} points)</p>`;
        html += `</div>`;
        
        finalScore.innerHTML = html;
    }

    updateLog() {
        const logArea = document.getElementById('logArea');
        logArea.innerHTML = this.game.gameState.log.slice(0, 100).map(entry => `
            <div class="log-entry ${entry.type}">
                <span style="color:#888;">[${entry.timestamp}]</span> ${entry.message}
            </div>
        `).join('');
    }

    formatCost(cost) {
        if (!cost) return 'Free';
        return GAME_CONFIG.RESOURCES.map(r => {
            const val = cost[r];
            if (val && val > 0) return `${GAME_CONFIG.RESOURCE_ICONS[r]}${val}`;
            return '';
        }).filter(s => s).join(' ') || 'Free';
    }

    formatStats(item) {
        return GAME_CONFIG.RESOURCES.map(r => {
            const val = item[r];
            if (val !== 0 && val !== undefined && val !== null) {
                return `${GAME_CONFIG.RESOURCE_ICONS[r]}${val}`;
            }
            return '';
        }).filter(s => s).join(' ') || 'None';
    }
}
