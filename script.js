// AOVIVO — lógica leve, modular, carregada com defer.
// Busca bares.json, renderiza o grid, filtra por região e só injeta
// o iframe do YouTube quando o card é clicado (mantém CLS zero).

(function () {
    'use strict';

    var REGIOES_LABEL = {
        centro: 'Centro',
        norte: 'Zona Norte',
        sul: 'Zona Sul',
        leste: 'Zona Leste',
        oeste: 'Zona Oeste'
    };

    var estado = {
        bares: [],
        regiaoAtiva: 'todos'
    };

    function elGrid() { return document.getElementById('baresGrid'); }
    function elStatus() { return document.getElementById('statusCarregamento'); }
    function elTemplate() { return document.getElementById('cardTemplate'); }

    function carregarBares() {
        return fetch('bares.json', { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('Falha ao carregar bares.json');
                return res.json();
            })
            .then(function (data) {
                estado.bares = Array.isArray(data.bares) ? data.bares : [];
                return estado.bares;
            });
    }

    function criarCard(bar) {
        var template = elTemplate();
        var node = template.content.cloneNode(true);
        var article = node.querySelector('.bar-card');
        var trigger = node.querySelector('.bar-card-trigger');
        var img = node.querySelector('.bar-card-img');
        var badgeAoVivo = node.querySelector('.badge-ao-vivo');
        var badgeRegiao = node.querySelector('.badge-regiao');
        var nome = node.querySelector('.bar-card-nome');
        var bairro = node.querySelector('.bar-card-bairro');
        var desc = node.querySelector('.bar-card-desc');
        var playerBox = node.querySelector('.bar-card-player');

        article.dataset.regiao = bar.regiao || '';
        article.dataset.id = bar.id || '';

        img.src = bar.imagemCapa || '';
        img.alt = 'Ambiente do ' + (bar.nome || 'estabelecimento');
        img.addEventListener('error', function () {
            img.closest('.bar-card-media').style.background =
                'linear-gradient(160deg, #2A2A2E, #131315)';
            img.style.visibility = 'hidden';
        });

        if (bar.aoVivoAgora) {
            badgeAoVivo.hidden = false;
        }
        badgeRegiao.textContent = REGIOES_LABEL[bar.regiao] || bar.regiao || '';

        nome.textContent = bar.nome || 'Bar sem nome cadastrado';
        bairro.textContent = bar.bairro || '';
        desc.textContent = bar.descricaoCurta || '';

        trigger.addEventListener('click', function () {
            var aberto = trigger.getAttribute('aria-expanded') === 'true';

            document.querySelectorAll('.bar-card-trigger[aria-expanded="true"]').forEach(function (outro) {
                if (outro !== trigger) {
                    outro.setAttribute('aria-expanded', 'false');
                    var outroPlayer = outro.closest('.bar-card').querySelector('.bar-card-player');
                    outroPlayer.hidden = true;
                    outroPlayer.innerHTML = '';
                }
            });

            if (aberto) {
                trigger.setAttribute('aria-expanded', 'false');
                playerBox.hidden = true;
                playerBox.innerHTML = '';
                return;
            }

            trigger.setAttribute('aria-expanded', 'true');
            playerBox.hidden = false;

            if (bar.linkYoutubeEmbed) {
                var iframe = document.createElement('iframe');
                iframe.src = bar.linkYoutubeEmbed + (bar.linkYoutubeEmbed.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1&rel=0';
                iframe.title = 'Transmissão ao vivo — ' + (bar.nome || '');
                iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.loading = 'lazy';
                playerBox.appendChild(iframe);
            } else {
                playerBox.innerHTML = '<p style="padding:1rem;color:#9B9B9F;">Transmissão indisponível no momento.</p>';
            }
        });

        return node;
    }

    function renderizar() {
        var grid = elGrid();
        var status = elStatus();
        var filtrados = estado.bares.filter(function (bar) {
            return estado.regiaoAtiva === 'todos' || bar.regiao === estado.regiaoAtiva;
        });

        grid.innerHTML = '';

        if (filtrados.length === 0) {
            var vazio = document.createElement('p');
            vazio.className = 'card-vazio';
            vazio.textContent = 'Nenhum bar cadastrado nessa região ainda.';
            grid.appendChild(vazio);
        } else {
            filtrados.forEach(function (bar) {
                grid.appendChild(criarCard(bar));
            });
        }

        status.hidden = true;
    }

    function initFiltros() {
        var grupo = document.getElementById('filtrosRegiao');
        if (!grupo) return;

        grupo.addEventListener('click', function (evento) {
            var botao = evento.target.closest('.filtro-btn');
            if (!botao) return;

            grupo.querySelectorAll('.filtro-btn').forEach(function (b) {
                b.classList.remove('is-active');
            });
            botao.classList.add('is-active');

            estado.regiaoAtiva = botao.dataset.regiao;
            renderizar();
        });
    }

    function initAno() {
        var span = document.getElementById('ano');
        if (span) span.textContent = new Date().getFullYear();
    }

    document.addEventListener('DOMContentLoaded', function () {
        initFiltros();
        initAno();

        carregarBares()
            .then(renderizar)
            .catch(function (erro) {
                var status = elStatus();
                status.textContent = 'Não foi possível carregar os bares agora. Tente novamente em instantes.';
                console.error(erro);
            });
    });
})();