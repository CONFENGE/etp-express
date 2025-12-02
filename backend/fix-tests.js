const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/modules/etps/etps.service.spec.ts');
let content = fs.readFileSync(file, 'utf8');

// Padrões de substituição
const replacements = [
  // create
  {
    from: /service\.create\(createDto, mockUser1Id\)/g,
    to: 'service.create(createDto, mockUser1Id, mockOrganizationId)',
  },

  // findAll sem userId
  {
    from: /service\.findAll\(paginationDto\)(?!,)/g,
    to: 'service.findAll(paginationDto, mockOrganizationId)',
  },

  // findAll com userId
  {
    from: /service\.findAll\(paginationDto, mockUser1Id\)/g,
    to: 'service.findAll(paginationDto, mockOrganizationId, mockUser1Id)',
  },

  // findOne sem userId
  {
    from: /service\.findOne\('etp-123'\)(?!,)/g,
    to: "service.findOne('etp-123', mockOrganizationId)",
  },
  {
    from: /service\.findOne\('non-existent'\)(?!,)/g,
    to: "service.findOne('non-existent', mockOrganizationId)",
  },

  // findOne com userId
  {
    from: /service\.findOne\('etp-123', mockUser1Id\)/g,
    to: "service.findOne('etp-123', mockOrganizationId, mockUser1Id)",
  },
  {
    from: /service\.findOne\('etp-123', mockUser2Id\)/g,
    to: "service.findOne('etp-123', mockOrganization2Id, mockUser2Id)",
  },

  // findOneMinimal sem userId
  {
    from: /service\.findOneMinimal\('etp-123'\)(?!,)/g,
    to: "service.findOneMinimal('etp-123', mockOrganizationId)",
  },
  {
    from: /service\.findOneMinimal\('non-existent'\)(?!,)/g,
    to: "service.findOneMinimal('non-existent', mockOrganizationId)",
  },

  // findOneMinimal com userId
  {
    from: /service\.findOneMinimal\('etp-123', mockUser1Id\)/g,
    to: "service.findOneMinimal('etp-123', mockOrganizationId, mockUser1Id)",
  },
  {
    from: /service\.findOneMinimal\('etp-123', mockUser2Id\)/g,
    to: "service.findOneMinimal('etp-123', mockOrganization2Id, mockUser2Id)",
  },

  // findOneWithSections sem userId
  {
    from: /service\.findOneWithSections\('etp-123'\)(?!,)/g,
    to: "service.findOneWithSections('etp-123', mockOrganizationId)",
  },
  {
    from: /service\.findOneWithSections\('non-existent'\)(?!,)/g,
    to: "service.findOneWithSections('non-existent', mockOrganizationId)",
  },

  // findOneWithSections com userId
  {
    from: /service\.findOneWithSections\('etp-123', mockUser1Id\)/g,
    to: "service.findOneWithSections('etp-123', mockOrganizationId, mockUser1Id)",
  },
  {
    from: /service\.findOneWithSections\('etp-123', mockUser2Id\)/g,
    to: "service.findOneWithSections('etp-123', mockOrganization2Id, mockUser2Id)",
  },

  // update
  {
    from: /service\.update\('etp-123', updateDto, mockUser1Id\)/g,
    to: "service.update('etp-123', updateDto, mockUser1Id, mockOrganizationId)",
  },
  {
    from: /service\.update\('etp-123', updateDto, mockUser2Id\)/g,
    to: "service.update('etp-123', updateDto, mockUser2Id, mockOrganization2Id)",
  },
  {
    from: /service\.update\('non-existent', \{\}, mockUser1Id\)/g,
    to: "service.update('non-existent', {}, mockUser1Id, mockOrganizationId)",
  },

  // findOneWithVersions
  {
    from: /service\.findOneWithVersions\('etp-123'\)(?!,)/g,
    to: "service.findOneWithVersions('etp-123', mockOrganizationId)",
  },
  {
    from: /service\.findOneWithVersions\('non-existent'\)(?!,)/g,
    to: "service.findOneWithVersions('non-existent', mockOrganizationId)",
  },

  // updateStatus
  {
    from: /service\.updateStatus\(\s*'etp-123',\s*EtpStatus\.IN_PROGRESS,\s*mockUser1Id\s*\)/g,
    to: "service.updateStatus('etp-123', EtpStatus.IN_PROGRESS, mockUser1Id, mockOrganizationId)",
  },
  {
    from: /service\.updateStatus\(\s*'etp-123',\s*EtpStatus\.IN_PROGRESS,\s*mockUser2Id\s*\)/g,
    to: "service.updateStatus('etp-123', EtpStatus.IN_PROGRESS, mockUser2Id, mockOrganization2Id)",
  },

  // remove
  {
    from: /service\.remove\('etp-123', mockUser1Id\)/g,
    to: "service.remove('etp-123', mockUser1Id, mockOrganizationId)",
  },
  {
    from: /service\.remove\('etp-123', mockUser2Id\)/g,
    to: "service.remove('etp-123', mockUser2Id, mockOrganization2Id)",
  },
  {
    from: /service\.remove\('non-existent', mockUser1Id\)/g,
    to: "service.remove('non-existent', mockUser1Id, mockOrganizationId)",
  },

  // getStatistics sem userId
  {
    from: /service\.getStatistics\(\)(?!;)/g,
    to: 'service.getStatistics(mockOrganizationId)',
  },

  // getStatistics com userId
  {
    from: /service\.getStatistics\(mockUser1Id\)/g,
    to: 'service.getStatistics(mockOrganizationId, mockUser1Id)',
  },
];

// Aplicar todas as substituições
replacements.forEach(({ from, to }) => {
  content = content.replace(from, to);
});

// Salvar arquivo
fs.writeFileSync(file, content, 'utf8');
console.log('✅ Arquivo atualizado com sucesso!');
