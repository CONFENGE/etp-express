# Backlog Order - Priorização Objetiva

**Data da auditoria:** 2025-11-08 09:40:07

## Metodologia

- **WSJF:** (User Value + Business Value + Risk Reduction + Time Criticality) / Size
- **RICE:** (Reach × Impact × Confidence) / Effort
- **Priority:** P0 (critical) → P3 (nice-to-have)
- **Risk:** Based on Severity × Probability

## Ordem de Execução

| #   | Issue                                                       | Type    | Area        | Priority | WSJF  | RICE  | Risk   | Effort | Dependencies                               | Status | Motivo                |
| --- | ----------------------------------------------------------- | ------- | ----------- | -------- | ----- | ----- | ------ | ------ | ------------------------------------------ | ------ | --------------------- |
| 1   | [#45](https://github.com/tjsasakifln/etp-express/issues/45) | unknown | unknown     | P1       | 18.00 | 20.00 | low    | 1h     | Blocked by #44                             | OPEN   | Alto WSJF             |
| 2   | [#53](https://github.com/tjsasakifln/etp-express/issues/53) | docs    | backend     | P1       | 11.50 | 6.25  | medium | 2h     | Blocked by #49                             | OPEN   | Alto WSJF             |
| 3   | [#44](https://github.com/tjsasakifln/etp-express/issues/44) | unknown | unknown     | P1       | 6.33  | 10.67 | low    | 3h     | Blocked by #45,#42,#47                     | OPEN   | Alto WSJF             |
| 4   | [#51](https://github.com/tjsasakifln/etp-express/issues/51) | fix     | typescript  | P1       | 7.00  | 9.60  | low    | 4h     | Blocked by #49,#54                         | OPEN   | Alto WSJF             |
| 5   | [#41](https://github.com/tjsasakifln/etp-express/issues/41) | unknown | unknown     | P1       | 8.00  | 6.67  | low    | 3h     |                                            | OPEN   | Alto WSJF             |
| 6   | [#52](https://github.com/tjsasakifln/etp-express/issues/52) | feat    | backend     | P1       | 7.67  | 6.67  | low    | 3h     | Blocked by #51,#49,#54; Blocks #49         | OPEN   | Alto WSJF             |
| 7   | [#50](https://github.com/tjsasakifln/etp-express/issues/50) | fix     | security    | P1       | 5.33  | 6.40  | medium | 6h     | Blocked by #49                             | OPEN   | Alto WSJF             |
| 8   | [#62](https://github.com/tjsasakifln/etp-express/issues/62) | docs    | backend     | P2       | 7.00  | 2.50  | medium | 4h     |                                            | OPEN   | Alto WSJF             |
| 9   | [#42](https://github.com/tjsasakifln/etp-express/issues/42) | unknown | unknown     | P2       | 4.50  | 5.00  | low    | 4h     | Blocked by #1,#13,#41                      | OPEN   | Alto WSJF             |
| 10  | [#34](https://github.com/tjsasakifln/etp-express/issues/34) | unknown | unknown     | P2       | 5.75  | 2.50  | medium | 4h     |                                            | OPEN   | Alto WSJF             |
| 11  | [#61](https://github.com/tjsasakifln/etp-express/issues/61) | fix     | security    | P2       | 3.25  | 4.80  | low    | 8h     | Blocked by #49                             | OPEN   | Alto WSJF             |
| 12  | [#63](https://github.com/tjsasakifln/etp-express/issues/63) | test    | backend     | P2       | 3.88  | 4.00  | high   | 8h     | Blocked by #49,#42,#48                     | OPEN   | Alto WSJF, Alto risco |
| 13  | [#46](https://github.com/tjsasakifln/etp-express/issues/46) | unknown | unknown     | P2       | 3.50  | 4.00  | low    | 8h     | Blocked by #38,#21,#35,#44,#39             | OPEN   | Alto WSJF             |
| 14  | [#43](https://github.com/tjsasakifln/etp-express/issues/43) | unknown | unknown     | P2       | 3.83  | 3.33  | low    | 6h     | Blocked by #1,#9,#42,#8                    | OPEN   | Alto WSJF             |
| 15  | [#23](https://github.com/tjsasakifln/etp-express/issues/23) | unknown | unknown     | P2       | 3.12  | 4.00  | low    | 8h     |                                            | OPEN   | Alto WSJF             |
| 16  | [#38](https://github.com/tjsasakifln/etp-express/issues/38) | unknown | unknown     | P2       | 2.75  | 4.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 17  | [#24](https://github.com/tjsasakifln/etp-express/issues/24) | unknown | unknown     | P2       | 2.75  | 4.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 18  | [#47](https://github.com/tjsasakifln/etp-express/issues/47) | unknown | unknown     | P2       | 3.33  | 3.33  | low    | 6h     |                                            | OPEN   | Alto WSJF             |
| 19  | [#6](https://github.com/tjsasakifln/etp-express/issues/6)   | unknown | unknown     | P2       | 2.50  | 4.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 20  | [#8](https://github.com/tjsasakifln/etp-express/issues/8)   | unknown | unknown     | P2       | 2.25  | 4.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 21  | [#7](https://github.com/tjsasakifln/etp-express/issues/7)   | unknown | unknown     | P2       | 2.25  | 4.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 22  | [#4](https://github.com/tjsasakifln/etp-express/issues/4)   | unknown | unknown     | P2       | 2.25  | 4.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 23  | [#3](https://github.com/tjsasakifln/etp-express/issues/3)   | unknown | unknown     | P2       | 2.25  | 4.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 24  | [#58](https://github.com/tjsasakifln/etp-express/issues/58) | test    | controllers | P2       | 2.40  | 3.20  | low    | 10h    | Blocked by #57,#54,#51,#52,#49; Blocks #54 | OPEN   | Prioridade normal     |
| 25  | [#11](https://github.com/tjsasakifln/etp-express/issues/11) | unknown | unknown     | P2       | 3.00  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 26  | [#2](https://github.com/tjsasakifln/etp-express/issues/2)   | unknown | unknown     | P2       | 3.00  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 27  | [#17](https://github.com/tjsasakifln/etp-express/issues/17) | unknown | unknown     | P2       | 2.38  | 3.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 28  | [#16](https://github.com/tjsasakifln/etp-express/issues/16) | unknown | unknown     | P2       | 2.38  | 3.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 29  | [#15](https://github.com/tjsasakifln/etp-express/issues/15) | unknown | unknown     | P2       | 2.38  | 3.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 30  | [#14](https://github.com/tjsasakifln/etp-express/issues/14) | unknown | unknown     | P2       | 2.38  | 3.00  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 31  | [#12](https://github.com/tjsasakifln/etp-express/issues/12) | unknown | unknown     | P2       | 2.88  | 2.50  | medium | 8h     |                                            | OPEN   | Prioridade normal     |
| 32  | [#36](https://github.com/tjsasakifln/etp-express/issues/36) | unknown | unknown     | P2       | 2.75  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 33  | [#22](https://github.com/tjsasakifln/etp-express/issues/22) | unknown | unknown     | P2       | 2.75  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 34  | [#10](https://github.com/tjsasakifln/etp-express/issues/10) | unknown | unknown     | P2       | 2.75  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 35  | [#56](https://github.com/tjsasakifln/etp-express/issues/56) | test    | etps        | P2       | 2.00  | 3.20  | low    | 10h    | Blocked by #55,#54,#51,#52,#49; Blocks #54 | OPEN   | Prioridade normal     |
| 36  | [#55](https://github.com/tjsasakifln/etp-express/issues/55) | test    | auth        | P2       | 2.50  | 2.50  | low    | 8h     | Blocked by #51,#54,#52,#49; Blocks #54     | OPEN   | Prioridade normal     |
| 37  | [#29](https://github.com/tjsasakifln/etp-express/issues/29) | unknown | unknown     | P2       | 2.50  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 38  | [#25](https://github.com/tjsasakifln/etp-express/issues/25) | unknown | unknown     | P2       | 2.50  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 39  | [#13](https://github.com/tjsasakifln/etp-express/issues/13) | unknown | unknown     | P2       | 2.50  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 40  | [#5](https://github.com/tjsasakifln/etp-express/issues/5)   | unknown | unknown     | P2       | 2.50  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 41  | [#39](https://github.com/tjsasakifln/etp-express/issues/39) | unknown | unknown     | P2       | 2.38  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 42  | [#37](https://github.com/tjsasakifln/etp-express/issues/37) | unknown | unknown     | P2       | 2.38  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 43  | [#35](https://github.com/tjsasakifln/etp-express/issues/35) | unknown | unknown     | P2       | 2.38  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 44  | [#18](https://github.com/tjsasakifln/etp-express/issues/18) | unknown | unknown     | P2       | 2.38  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 45  | [#59](https://github.com/tjsasakifln/etp-express/issues/59) | test    | services    | P2       | 2.08  | 2.67  | low    | 12h    | Blocked by #58,#54,#51,#52,#49; Blocks #54 | OPEN   | Prioridade normal     |
| 46  | [#40](https://github.com/tjsasakifln/etp-express/issues/40) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 47  | [#33](https://github.com/tjsasakifln/etp-express/issues/33) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 48  | [#32](https://github.com/tjsasakifln/etp-express/issues/32) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 49  | [#31](https://github.com/tjsasakifln/etp-express/issues/31) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 50  | [#30](https://github.com/tjsasakifln/etp-express/issues/30) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 51  | [#28](https://github.com/tjsasakifln/etp-express/issues/28) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 52  | [#26](https://github.com/tjsasakifln/etp-express/issues/26) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 53  | [#21](https://github.com/tjsasakifln/etp-express/issues/21) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 54  | [#20](https://github.com/tjsasakifln/etp-express/issues/20) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 55  | [#19](https://github.com/tjsasakifln/etp-express/issues/19) | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 56  | [#9](https://github.com/tjsasakifln/etp-express/issues/9)   | unknown | unknown     | P2       | 2.25  | 2.50  | low    | 8h     |                                            | OPEN   | Prioridade normal     |
| 57  | [#60](https://github.com/tjsasakifln/etp-express/issues/60) | feat    | backend     | P3       | 1.31  | 2.50  | low    | 16h    | Blocked by #49                             | OPEN   | Prioridade normal     |
| 58  | [#57](https://github.com/tjsasakifln/etp-express/issues/57) | test    | sections    | P3       | 1.58  | 1.67  | low    | 12h    | Blocked by #56,#54,#51,#52,#49; Blocks #54 | OPEN   | Prioridade normal     |
| 59  | [#48](https://github.com/tjsasakifln/etp-express/issues/48) | unknown | unknown     | P3       | 1.44  | 1.25  | low    | 16h    | Blocked by #44,#22,#23,#42,#43             | OPEN   | Prioridade normal     |
| 60  | [#54](https://github.com/tjsasakifln/etp-express/issues/54) | test    | backend     | P3       | 0.48  | 0.53  | medium | 60h    | Blocked by #49,#51,#52,#53; Blocks #49     | OPEN   | Prioridade normal     |
