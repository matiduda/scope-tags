export const CSSOverrides = `
:root {
    --justify-important: left;
    --width-content: 1800px;
}

hr {
    margin: 1rem 0;
}

.issue-header {
    display: flex;
    justify-content: space-between;
}

.addotional-data-on-hover {
    color: var(--color-secondary);
}

.addotional-data-on-hover:hover {
    color: #606060;
}

.addotional-data-on-hover-light {
    color: #00E0FF;
}

.addotional-data-on-hover-light:hover {
    color: #606060;
}

.ignored-file {
    background-color: #ffffff;
    color: #cccccc;
}

table > p {
    margin-block-start: 0em;
    margin-block-end: 0em;
}
`;