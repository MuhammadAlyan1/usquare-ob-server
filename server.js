const express = require('express');
const bodyParser = require('body-parser');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const app = express();
const port = 3000;
const he = require('he');

app.use(bodyParser.json());

app.get('/fetch-emails', async (req, res) => {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'alyan0332@gmail.com',
      pass: 'krac hfjx sdis lvgu'
    }
  });

  try {
    await client.connect();

    const emails = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date = new Date(today);
    date.setDate(today.getDate() - 5);

    let lock = await client.getMailboxLock('INBOX');
    try {
      for await (let message of client.fetch(
        {
          sentSince: date.toISOString()
        },
        {
          envelope: true,
          uid: true,
          flags: true,
          internalDate: true,
          size: true,
          source: true,
          threadId: true,
          labels: true,
          headers: true,
          bodyParts: ['TEXT']
        }
      )) {
        const subject = message?.envelope?.subject;
        if (!subject) continue;

        const carsForSaleRegex = /carsforsale.com/gi;
        const autoTraderRegex = /autotrader/gi;
        const edmundsDealerDirectRegex = /edmunds\s*DealerDirect/gi;

        let data = null;

        if (subject.match(edmundsDealerDirectRegex)) {
          const parsedEmail = await simpleParser(message?.source);
          data = parseEdmundsDealerDirectLeads(parsedEmail?.textAsHtml);
        } else if (subject.match(carsForSaleRegex)) {
          const parsedEmail = await simpleParser(message?.source);
          data = parseCarsForSaleLeads(parsedEmail?.textAsHtml);
        } else if (subject.match(autoTraderRegex)) {
          const parsedEmail = await simpleParser(message?.source);
          data = parseAutoTraderLeads(parsedEmail?.textAsHtml);
        } else {
          continue;
        }

        emails.push({
          date: message?.envelope?.date,
          subject,
          data
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();

    res.json(emails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching emails' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const parseEdmundsDealerDirectLeads = (text) => {
  if (!text) return null;

  regex = {
    customerEmail:
      /E-mail:\s*<a\s*href="mailto:([\w.-]+@([\w-]+\.)+[\w-]{2,4})/gi,
    customerFirstName: /first\s*name:\s*[a-z,.\s]*/gi,
    customerLastName: /last\s*name:\s*[a-z,.\s]*/gi,
    customerCity: /city:\s*[a-z,.]+/gi,
    customerState: /state:\s*[a-z,.]+/gi,
    customerPostalCode: /postal\s*code:\s*[0-9]{5}/gi,
    customerPhoneNumber: /phone:\s((?!<br\/>).)+/gi,
    comment: /comments:\s[a-z\s.,]*/gi,
    vehicleMake: /make:\s*([a-z]+\.?\s*)+/gi,
    vehicleModel: /model:\s*([a-z]+\.?\s*)+/gi,
    vehicleYear: /year:\s*[0-9]+/gi,
    vehiclePrice: /price:\s*\$([0-9,.]+)+/gi,
    vehicleInteriorColor: /interior\s*color:\s*[a-z,.]+/gi,
    vehicleExteriorColor: /exterior\s*color:\s*[a-z,.]+/gi,
    vehicleVin: /vin:\s*[a-z0-9]{17}/gi,
    vehicleTrim: /trim:\s*[a-z0-9/\s.,/(/))]+/gi,
    vehicleStock: /stock\s*:\s*[a-z0-9]+/gi,
    vehicleDescription: /vehicle\s*description:<\/p><p>((?!<\/p>).)+/gi
  };

  const firstNameResult = text.match(regex.customerFirstName);
  const firstName =
    firstNameResult && firstNameResult[0]?.split(/name:/gi)[1]?.trim();

  const lastNameResult = text.match(regex.customerLastName);
  const lastName =
    lastNameResult && lastNameResult[0]?.split(/name:/gi)[1]?.trim();

  const emailResult = text.match(regex.customerEmail);
  const email = emailResult && emailResult[0]?.split(/mailto:/gi)[1]?.trim();

  const cityResult = text.match(regex.customerCity);
  const city = cityResult && cityResult[0]?.split(/city:/gi)[1]?.trim();

  const postalCodeResult = text.match(regex.customerPostalCode);
  const customerPostalCode =
    postalCodeResult &&
    postalCodeResult[0]?.split(/postal\s*code:/gi)[1]?.trim();

  const stateResult = text.match(regex.customerState);
  const state = stateResult && stateResult[0]?.split(/state:/gi)[1]?.trim();

  const phoneNumberResult = text.match(regex.customerPhoneNumber);
  let customerPhoneNumber =
    phoneNumberResult && phoneNumberResult[0]?.split(/phone:/gi)[1]?.trim();

  if (customerPhoneNumber?.match(/Customer did not specify/gi)) {
    customerPhoneNumber = null;
  }

  const commentResult = text.match(regex.comment);
  const comment =
    commentResult && commentResult[0]?.split(/comments:\s*/gi)[1]?.trim();

  const vehicleMakeResult = text.match(regex.vehicleMake);
  const vehicleMake =
    vehicleMakeResult && vehicleMakeResult[0]?.split(/make:/gi)[1]?.trim();

  const vehicleModelResult = text.match(regex.vehicleModel);
  const vehicleModel =
    vehicleModelResult && vehicleModelResult[0]?.split(/model:/gi)[1]?.trim();

  const vehicleYearResult = text.match(regex.vehicleYear);
  const vehicleYear =
    vehicleYearResult && vehicleYearResult[0]?.split(/year:/gi)[1]?.trim();

  const vehiclePriceResult = text.match(regex.vehiclePrice);
  const vehiclePrice =
    vehiclePriceResult && vehiclePriceResult[0]?.split(/price:/gi)[1]?.trim();

  const vehicleVinResult = text.match(regex.vehicleVin);
  const vehicleVin =
    vehicleVinResult && vehicleVinResult[0]?.split(/vin:/gi)[1]?.trim();

  const vehicleInteriorColorResult = text.match(regex.vehicleInteriorColor);
  const vehicleInteriorColor =
    vehicleInteriorColorResult &&
    vehicleInteriorColorResult[0]?.split(/color:/gi)[1]?.trim();

  const vehicleExteriorColorResult = text.match(regex.vehicleExteriorColor);
  const vehicleExteriorColor =
    vehicleExteriorColorResult &&
    vehicleExteriorColorResult[0]?.split(/color:/gi)[1]?.trim();

  const vehicleTrimResult = text.match(regex.vehicleTrim);
  const vehicleTrim =
    vehicleTrimResult && vehicleTrimResult[0]?.split(/trim:/gi)[1]?.trim();

  const vehicleStockIdResult = text.match(regex.vehicleStock);
  const vehicleStock =
    vehicleStockIdResult &&
    vehicleStockIdResult[0]?.split(/stock\s*:/gi)[1]?.trim();

  return {
    customer: {
      email: email || null,
      city: city || null,
      state: state || null,
      postalCode: parseInt(customerPostalCode) || null,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: customerPhoneNumber || null,
      comments: comment || null
    },
    vehicle: {
      make: vehicleMake || null,
      model: vehicleModel || null,
      year: parseInt(vehicleYear) || null,
      price: vehiclePrice || null,
      vin: vehicleVin || null,
      trim: vehicleTrim || null,
      exteriorColor: vehicleExteriorColor || null,
      interiorColor: vehicleInteriorColor || null,
      stock: vehicleStock || null
    }
  };
};

const parseCarsForSaleLeads = (text) => {
  if (!text) return null;

  const regex = {
    year: /year:\s*[\d]{4}/gi,
    make: /make:\s*([a-z]+\s*)*/gi,
    model: /model:\s*([a-z]+\s*)*/gi,
    color: /color:\s*([a-z]+\s*)*/gi,
    price: /price:\s*\$([\d]*,?)+/gi,
    mileage: /mileage:\s*([\d]*,?)+/gi,
    stockNumber: /stock\s*#:\s[a-z0-9]+/gi,
    lot: /Lot:\s*(.*?)(?=<\/p>)/gi,
    customerMetaData: /comments<br\/>(.*?)<br\/>\d{10}<br\/>/gi,
    comment: /comments<br\/>[a-z\s.,']*<br\/>/gi,
    phoneNumber: /<br\/>(\d*)<br\/>/gi,
    fullName: /<br\/>[a-z]*\s*[a-z]*\s*[a-z]*\s*<br\/>/gi
  };

  const yearResult = text.match(regex.year);
  const year = yearResult && yearResult[0]?.split(':')[1]?.trim();

  const makeResult = text.match(regex.make);
  const make = makeResult && he.decode(makeResult[0]?.split(':')[1]?.trim());

  const modelResult = text.match(regex.model);
  const model = modelResult && he.decode(modelResult[0]?.split(':')[1]?.trim());

  const colorResult = text.match(regex.color);
  const color = colorResult && he.decode(colorResult[0]?.split(':')[1]?.trim());

  const priceResult = text.match(regex.price);
  const price = priceResult && priceResult[0]?.split(':')[1]?.trim();

  const mileageResult = text.match(regex.mileage);
  const mileage =
    mileageResult && he.decode(mileageResult[0]?.split(':')[1]?.trim());

  const stockNumberResult = text.match(regex.stockNumber);
  const stockNumber =
    stockNumberResult && he.decode(stockNumberResult[0]?.split(':')[1]?.trim());

  const lotResult = text.match(regex.lot);
  const lot = lotResult && he.decode(lotResult[0]?.split(':')[1]?.trim());

  const customerMetaDataString = text.match(regex.customerMetaData);

  const commentResult = customerMetaDataString[0]?.match(regex.comment);
  const comment =
    commentResult && he.decode(commentResult[0]?.split('<br/>')[1]?.trim());

  const phoneNumberResult = customerMetaDataString[0].match(regex.phoneNumber);
  const phoneNumber =
    phoneNumberResult && phoneNumberResult[0]?.split('<br/>')[1]?.trim();

  const fullNameResult = customerMetaDataString[0].match(regex.fullName);
  const fullName =
    fullNameResult && he.decode(fullNameResult[0]?.split('<br/>')[1]?.trim());

  return {
    vehicle: {
      year: year || null,
      make: make || null,
      model: model || null,
      color: color || null,
      price: price || null,
      mileage: mileage || null,
      stockNumber: stockNumber || null,
      lot: lot || null
    },
    customer: {
      comment: comment || null,
      fullName: fullName || null,
      phoneNumber: phoneNumber || null
    }
  };
};

const parseAutoTraderLeads = (text) => {
  if (!text) return null;

  regex = {
    customerName: /\*name:\*\s*([a-z]+\.?\s*)+/gi,
    email:
      /\*E-Mail Address:\* <a\s*href="mailto:([\w.-]+@([\w-]+\.)+[\w-]{2,4})/gi,
    phoneNumber: /\*phone:\*\s\*((?!<br\/>).)+\*/gi,
    bestContactTime: /\*Best Contact Time:\*\s\*((?!<br\/>).)+\*/,
    zipcode: /\*zip\s*code:\*\s*[0-9]{5}/gi,
    comment: /\*buyer\s*comments:\*<\/p><p>((?!<\/p>).)+/gi,
    vehicleMake: /\*make:\*\s*([a-z]+\.?\s*)+/gi,
    vehicleModel: /\*model:\*\s*([a-z]+\.?\s*)+/gi,
    vehicleYear: /\*year:\*\s*([0-9]+)+/gi,
    vehiclePrice: /\*price:\*\s*\$([0-9,.]+)+/gi,
    vehicleMileage: /\*mileage:\*\s*([0-9,.]+)+/gi,
    vehicleBodyStyle: /\*body\s*style:\*\s*[a-z\s,]+/gi,
    vehicleVin: /\*vin:\*\s*[a-z0-9]+/gi,
    vehicleTrim: /\*trim:\*\s*[a-z0-9/\s.,]+/gi,
    vehicleColor: /\*color:\*\s*[a-z/\s.,]+/gi,
    vehicleCylinders: /\*cylinders:\*\s*[a-z0-9-/\s.,]+/gi,
    vehicleTransmission: /\*transmission:\*\s*[a-z-/\s.,]+/gi,
    vehicleStockId: /\*stock\s*id:\*\s*[a-z0-9]+/gi,
    vehicleDescription: /\*vehicle\s*description:\*<\/p><p>((?!<\/p>).)+/gi
  };

  const fullNameResult = text.match(regex.customerName);
  const fullName = fullNameResult[0]?.split(/\*name:\*/gi)[1]?.trim();

  const emailResult = text.match(regex.email);
  const email = emailResult && emailResult[0]?.split('mailto:')[1]?.trim();

  const phoneNumberResult = text.match(regex.phoneNumber);
  let phoneNumber =
    phoneNumberResult && phoneNumberResult[0]?.split(/\*phone:\*/gi)[1]?.trim();

  if (phoneNumber?.match(/\*Customer did not specify\*/gi)) {
    phoneNumber = null;
  }

  const bestContactTimeResult = text.match(regex.bestContactTime);
  let bestContactTime =
    bestContactTimeResult &&
    bestContactTimeResult[0]?.split(/\*Best Contact Time:\*/gi)?.[1].trim();

  if (bestContactTime?.match(/\*Customer did not specify\*/gi)) {
    bestContactTime = null;
  }

  const zipcodeResult = text.match(regex.zipcode);
  const zipcode =
    zipcodeResult && zipcodeResult[0]?.split(/\*zip\s*code:\*/gi)[1]?.trim();

  const commentResult = text.match(regex.comment);
  const comment =
    commentResult &&
    commentResult[0]?.split(/\*buyer\s*comments:\*\s*<\/p><p>/gi)[1]?.trim();

  const vehicleMakeResult = text.match(regex.vehicleMake);
  const vehicleMake =
    vehicleMakeResult && vehicleMakeResult[0]?.split(/\*make:\*/gi)[1]?.trim();

  const vehicleModelResult = text.match(regex.vehicleModel);
  const vehicleModel =
    vehicleModelResult &&
    vehicleModelResult[0]?.split(/\*model:\*/gi)[1]?.trim();

  const vehicleYearResult = text.match(regex.vehicleYear);
  const vehicleYear =
    vehicleYearResult && vehicleYearResult[0]?.split(/\*year:\*/gi)[1]?.trim();

  const vehiclePriceResult = text.match(regex.vehiclePrice);
  const vehiclePrice =
    vehiclePriceResult &&
    vehiclePriceResult[0]?.split(/\*price:\*/gi)[1]?.trim();

  const vehicleMileageResult = text.match(regex.vehicleMileage);
  const vehicleMileage =
    vehicleMileageResult &&
    vehicleMileageResult[0]?.split(/\*mileage:\*/gi)[1]?.trim();

  const vehicleBodyStyleResult = text.match(regex.vehicleBodyStyle);
  const vehicleBodyStyle =
    vehicleBodyStyleResult &&
    vehicleBodyStyleResult[0]?.split(/\*body\s*style:\*/gi)[1]?.trim();

  const vehicleVinResult = text.match(regex.vehicleVin);
  const vehicleVin =
    vehicleVinResult && vehicleVinResult[0]?.split(/\*vin:\*/gi)[1]?.trim();

  const vehicleTrimResult = text.match(regex.vehicleTrim);
  const vehicleTrim =
    vehicleTrimResult && vehicleTrimResult[0]?.split(/\*trim:\*/gi)[1]?.trim();

  const vehicleColorResult = text.match(regex.vehicleColor);
  const vehicleColor =
    vehicleColorResult &&
    vehicleColorResult[0]?.split(/\*color:\*/gi)[1]?.trim();

  const vehicleCylindersResult = text.match(regex.vehicleCylinders);
  const vehicleCylinders =
    vehicleCylindersResult &&
    vehicleCylindersResult[0]?.split(/\*cylinders:\*/gi)[1]?.trim();

  const vehicleTransmissionResult = text.match(regex.vehicleTransmission);
  const vehicleTransmission =
    vehicleTransmissionResult &&
    vehicleTransmissionResult[0]?.split(/\*transmission:\*/gi)[1]?.trim();

  const vehicleStockIdResult = text.match(regex.vehicleStockId);
  const vehicleStockId =
    vehicleStockIdResult &&
    vehicleStockIdResult[0]?.split(/\*stock\s*id:\*/gi)[1]?.trim();

  const vehicleDescriptionResult = text.match(regex.vehicleDescription);
  const vehicleDescription =
    vehicleDescriptionResult &&
    vehicleDescriptionResult[0]
      ?.split(/\*vehicle\s*description:\*\s*<\/p><p>/gi)[1]
      ?.trim();

  return {
    customer: {
      fullName: fullName || null,
      email: email || null,
      phone: phoneNumber || null,
      bestContactTime: bestContactTime || null,
      zipcode: parseInt(zipcode) || null,
      comments: comment || null
    },
    vehicle: {
      make: vehicleMake || null,
      model: vehicleModel || null,
      year: parseInt(vehicleYear) || null,
      price: vehiclePrice || null,
      mileage: vehicleMileage || null,
      bodyStyle: vehicleBodyStyle || null,
      vin: vehicleVin || null,
      trim: vehicleTrim || null,
      color: vehicleColor || null,
      cylinders: vehicleCylinders || null,
      transmission: vehicleTransmission || null,
      stockId: vehicleStockId || null,
      description: vehicleDescription || null
    }
  };
};
